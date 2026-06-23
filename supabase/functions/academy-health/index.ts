import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_SECRETS = [
  "ECOSYSTEM_API_KEY",
  "PLAY_WEBHOOK_SECRET",
  "ECOSYSTEM_DISPATCH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const ACADEMY_TARGETS = ["academy", "fgn_academy"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Verify caller is an admin.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ error: "Missing authorization" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid session" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Admin only" }, 403);
    }

    // 1) Required secrets presence (boolean only — never expose values).
    const secrets: Record<string, boolean> = {};
    for (const name of REQUIRED_SECRETS) {
      const v = Deno.env.get(name);
      secrets[name] = !!(v && v.length > 0);
    }

    // 2) Webhooks targeting academy.
    const { data: webhooks } = await admin
      .from("ecosystem_webhooks")
      .select("id, target_app, event_type, is_active, webhook_url")
      .in("target_app", ACADEMY_TARGETS);
    const whTotal = webhooks?.length ?? 0;
    const whActive = (webhooks ?? []).filter((w: any) => w.is_active).length;
    const whEvents = Array.from(
      new Set((webhooks ?? []).filter((w: any) => w.is_active).map((w: any) => w.event_type))
    );

    // 3) Sync log stats for academy in last 24h (success/error totals + per-type recent).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await admin
      .from("ecosystem_sync_log")
      .select("data_type, status, error_message, created_at, records_synced")
      .in("target_app", ACADEMY_TARGETS)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    const perType: Record<string, {
      data_type: string;
      total: number;
      failures: number;
      last_success: string | null;
      last_error: string | null;
      last_error_message: string | null;
    }> = {};
    let okCount = 0;
    let errCount = 0;
    for (const row of (logs ?? []) as any[]) {
      const t = row.data_type || "unknown";
      perType[t] ||= {
        data_type: t,
        total: 0,
        failures: 0,
        last_success: null,
        last_error: null,
        last_error_message: null,
      };
      const g = perType[t];
      g.total += 1;
      if (row.status === "success") {
        okCount += 1;
        if (!g.last_success) g.last_success = row.created_at;
      } else {
        errCount += 1;
        g.failures += 1;
        if (!g.last_error) {
          g.last_error = row.created_at;
          g.last_error_message = row.error_message ?? "Unknown error";
        }
      }
    }

    // 4) Queue depths via existing RPC (if present).
    let queue: any = null;
    try {
      const { data: q } = await admin.rpc("get_academy_queue_stats" as any);
      queue = q ?? null;
    } catch {
      queue = null;
    }

    // 5) Overall status banner.
    const missingSecrets = Object.entries(secrets)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    const status =
      missingSecrets.length > 0 || whActive === 0
        ? "error"
        : errCount > 0
        ? "degraded"
        : "healthy";

    return json({
      status,
      checked_at: new Date().toISOString(),
      secrets,
      missing_secrets: missingSecrets,
      webhooks: {
        total: whTotal,
        active: whActive,
        event_types: whEvents,
      },
      sync_24h: {
        success: okCount,
        error: errCount,
        per_type: Object.values(perType).sort((a, b) =>
          a.data_type.localeCompare(b.data_type)
        ),
      },
      queue,
    });
  } catch (e) {
    console.error("academy-health error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
