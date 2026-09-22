import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID = new Set([
  "simulation_activity.created",
  "simulation_activity.updated",
  "simulation_activity.retired",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { simulation_activity_id, event_type } = await req.json();
    if (!simulation_activity_id || !VALID.has(event_type)) {
      return new Response(JSON.stringify({ error: "simulation_activity_id and a valid event_type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: activity, error: aErr } = await admin
      .from("simulation_activities")
      .select(
        "id, canonical_name, canonical_slug, canonical_description, game_id, game_version, activity_category, industry_domain, status, schema_version, updated_at"
      )
      .eq("id", simulation_activity_id)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!activity) {
      return new Response(JSON.stringify({ error: "Activity not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dispatchSecret = Deno.env.get("ECOSYSTEM_DISPATCH_SECRET") || serviceRoleKey;
    const res = await fetch(`${supabaseUrl}/functions/v1/ecosystem-webhook-dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dispatchSecret}`,
      },
      body: JSON.stringify({
        event_type,
        payload: {
          simulation_activity_id: activity.id,
          canonical_name: activity.canonical_name,
          canonical_slug: activity.canonical_slug,
          canonical_description: activity.canonical_description,
          game_id: activity.game_id,
          game_version: activity.game_version,
          activity_category: activity.activity_category,
          industry_domain: activity.industry_domain,
          status: activity.status,
          schema_version: activity.schema_version,
          updated_at: activity.updated_at,
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ event_type, dispatch: body }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("simulation-activity-events error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
