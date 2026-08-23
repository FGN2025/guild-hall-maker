// Daily digest of everything sitting in pending_review, per tenant.
// Silence must not look like "nothing is wrong": overdue_notified_at fires once
// per post forever, so a post ignored for twelve days produced exactly one
// notice. This recurring digest is the counterweight. One email per recipient
// per day, only when the queue is non-empty. No per-post spam.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BUILD_ID } from "../_shared/build-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fmt(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

function windowLabel(iso: string, now: number): string {
  const diffH = (new Date(iso).getTime() - now) / 3600_000;
  if (diffH < 0) {
    const d = Math.floor(-diffH / 24);
    return d >= 1 ? `past window by ${d}d` : `past window by ${Math.round(-diffH)}h`;
  }
  if (diffH < 48) return `due in ${Math.round(diffH)}h`;
  return `due in ${Math.round(diffH / 24)}d`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ build_id: BUILD_ID }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const todayKey = new Date().toISOString().slice(0, 10);

  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select("id, tenant_id, platform, scheduled_at, campaign_id")
    .eq("status", "pending_review")
    .order("scheduled_at", { ascending: true })
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group by tenant
  const byTenant = new Map<string, any[]>();
  for (const p of posts ?? []) {
    if (!p.tenant_id) continue;
    if (!byTenant.has(p.tenant_id)) byTenant.set(p.tenant_id, []);
    byTenant.get(p.tenant_id)!.push(p);
  }

  const results: any[] = [];

  for (const [tenantId, list] of byTenant) {
    const { data: tenant } = await supabase
      .from("tenants").select("name").eq("id", tenantId).maybeSingle();

    const campaignIds = Array.from(new Set(list.map((p) => p.campaign_id).filter(Boolean)));
    const titleById = new Map<string, string>();
    if (campaignIds.length > 0) {
      const { data: camps } = await supabase
        .from("marketing_campaigns").select("id, title").in("id", campaignIds);
      for (const c of camps ?? []) titleById.set(c.id, c.title);
    }

    const items = list.slice(0, 25).map((p) => ({
      title: titleById.get(p.campaign_id) || "Untitled post",
      platform: p.platform,
      scheduledAt: p.scheduled_at ? fmt(p.scheduled_at) : undefined,
      window: p.scheduled_at ? windowLabel(p.scheduled_at, now) : undefined,
    }));
    const lapsed = list.filter((p) => p.scheduled_at && new Date(p.scheduled_at).getTime() < now).length;
    const dueSoon = list.filter((p) => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at).getTime();
      return d >= now && d < now + 48 * 3600_000;
    }).length;

    const { data: recipients } = await supabase
      .rpc("get_marketing_notification_recipients", {
        _tenant_id: tenantId,
        _category: "draft_new",
      });

    for (const r of recipients ?? []) {
      if (!Array.isArray(r.channels) || !r.channels.includes("email") || !r.email) continue;
      // Canonical send path: render-then-enqueue.
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "pending-review-digest",
          recipientEmail: r.email,
          idempotencyKey: `pending-review-${tenantId}-${r.user_id}-${todayKey}`,
          templateData: {
            tenantName: tenant?.name || "your tenant",
            total: list.length,
            lapsed,
            dueSoon,
            items,
            dateLabel: todayKey,
            link: "https://play.fgn.gg/tenant/marketing?tab=agent",
          },
        },
      });
      results.push({ tenant: tenant?.name, to: r.email, ok: !sendErr, error: sendErr?.message });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, build_id: BUILD_ID, tenants: byTenant.size, sent: results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
