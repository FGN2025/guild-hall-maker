import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("SCHEDULED_POSTS_CRON_SECRET") ?? "";

    // Accept:
    //  - Bearer <service role key> (server-to-server)
    //  - Bearer <SCHEDULED_POSTS_CRON_SECRET> (dedicated cron)
    //  - Bearer <JWT> where the payload role is 'anon' or 'service_role'
    //    (standard pg_cron invocation from this project, which sends the
    //    project's anon/publishable key — verify_jwt=false so we validate here).
    const authHeader = req.headers.get("Authorization") || "";
    let authorized = false;
    if (authHeader === `Bearer ${serviceKey}` || (cronSecret && authHeader === `Bearer ${cronSecret}`)) {
      authorized = true;
    } else if (authHeader.startsWith("Bearer eyJ")) {
      try {
        const token = authHeader.slice("Bearer ".length);
        const parts = token.split(".");
        if (parts.length >= 2) {
          const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
          const payload = JSON.parse(atob(b64 + pad));
          if (payload.role === "service_role" || payload.role === "anon") {
            authorized = true;
          }
        }
      } catch (_) { /* fall through */ }
    }
    if (!authorized) {
      console.log(`[publish-scheduled-posts] unauthorized invocation (auth prefix=${authHeader.slice(0, 20)}...)`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const nowIso = new Date().toISOString();

    // 0. Flush marketing draft digests whose window has elapsed.
    let digestsSent = 0;
    const { data: dueDigests } = await supabase
      .from("marketing_notification_state")
      .select("*")
      .lte("next_flush_at", nowIso)
      .limit(50);

    for (const row of dueDigests ?? []) {
      const items: any[] = Array.isArray(row.pending_ids) ? row.pending_ids : [];
      if (items.length === 0) {
        await supabase.from("marketing_notification_state").delete().eq("id", row.id);
        continue;
      }
      // Group by recipient user_id
      const byUser = new Map<string, any[]>();
      for (const it of items) {
        const uid = it.user_id;
        if (!uid) continue;
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid)!.push(it);
      }
      // Look up tenant name + emails
      const { data: tenant } = await supabase.from("tenants").select("name").eq("id", row.tenant_id).maybeSingle();
      for (const [uid, list] of byUser) {
        const { data: userRow } = await supabase.auth.admin.getUserById(uid);
        const email = userRow?.user?.email;
        if (!email) continue;
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            templateName: "marketing-draft-digest",
            recipientEmail: email,
            idempotencyKey: `mkt-digest-${row.id}-${uid}-${row.updated_at}`,
            templateData: {
              tenantName: tenant?.name || "your tenant",
              agentSource: row.agent_source,
              items: list,
              link: "/tenant/marketing?tab=agent",
            },
          },
        });
        digestsSent++;
      }
      await supabase.from("marketing_notification_state").delete().eq("id", row.id);
    }


    // 1. Overdue pending_review — approved late or never; notify humans.
    const { data: overduePending } = await supabase
      .from("scheduled_posts")
      .select("id, tenant_id, platform, scheduled_at, agent_source, overdue_notified_at")
      .eq("status", "pending_review")
      .lte("scheduled_at", nowIso)
      .is("overdue_notified_at", null)
      .limit(100);

    for (const p of overduePending ?? []) {
      await supabase.rpc("enqueue_marketing_notification", {
        _tenant_id: p.tenant_id,
        _category: "overdue",
        _related_kind: "scheduled_post",
        _related_id: p.id,
        _title: "Scheduled post is overdue",
        _message: `A ${p.platform} post scheduled for ${p.scheduled_at} is still awaiting review.`,
        _link: "/tenant/marketing?tab=agent",
        _agent_source: p.agent_source,
        _payload: { id: p.id },
      });
      await supabase
        .from("scheduled_posts")
        .update({ overdue_notified_at: nowIso })
        .eq("id", p.id);
    }

    // 2. Undeliverable check: pending posts due but no active social_connection for their platform.
    const { data: duePosts, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .limit(50);

    if (error) throw error;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, overdue_notified: overduePending?.length ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;
    let undeliverable = 0;

    async function resolveImageUrl(raw: string | null | undefined): Promise<string | null> {
      if (!raw) return null;
      const marker = "/tenant-marketing/";
      const idx = raw.indexOf(marker);
      if (idx === -1) return raw;
      let objectPath = raw.slice(idx + marker.length);
      const q = objectPath.indexOf("?");
      if (q !== -1) objectPath = objectPath.slice(0, q);
      objectPath = decodeURIComponent(objectPath);
      const { data, error } = await supabase.storage
        .from("tenant-marketing")
        .createSignedUrl(objectPath, 60 * 60);
      if (error || !data?.signedUrl) return raw;
      return data.signedUrl;
    }

    async function resolveActiveConnection(
      tenantId: string,
      platform: string,
      connId: string | null,
    ): Promise<{ id: string } | null> {
      if (connId) {
        const { data } = await supabase
          .from("social_connections")
          .select("id, is_active")
          .eq("id", connId)
          .maybeSingle();
        if (data?.is_active) return { id: data.id };
        return null;
      }
      const { data } = await supabase
        .from("social_connections")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("platform", platform)
        .eq("is_active", true)
        .limit(1);
      if (data && data.length) return { id: data[0].id };
      return null;
    }

    for (const post of duePosts) {
      try {
        // Guard: undeliverable? Leave status='pending' but notify humans (once).
        if (post.platform !== "discord") {
          const ok = await hasActiveConnection(post.tenant_id, post.platform, post.connection_id);
          if (!ok) {
            undeliverable++;
            if (!post.undeliverable_notified_at) {
              await supabase.rpc("enqueue_marketing_notification", {
                _tenant_id: post.tenant_id,
                _category: "undeliverable",
                _related_kind: "scheduled_post",
                _related_id: post.id,
                _title: "Scheduled post is undeliverable",
                _message: `A ${post.platform} post is approved but has no active ${post.platform} connection. Connect ${post.platform} to publish.`,
                _link: "/tenant/marketing?tab=connections",
                _agent_source: post.agent_source,
                _payload: { id: post.id, platform: post.platform },
              });
              await supabase
                .from("scheduled_posts")
                .update({
                  undeliverable_reason: `No active ${post.platform} connection at dispatch time`,
                  undeliverable_notified_at: nowIso,
                })
                .eq("id", post.id);
            }
            continue;
          }
        }

        const freshImage = await resolveImageUrl(post.image_url);
        let publishRes: Response;

        if (post.platform === "discord") {
          publishRes = await fetch(`${supabaseUrl}/functions/v1/discord-send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              purpose: post.discord_purpose || "scheduled_post",
              tenant_id: post.discord_tenant_id || post.tenant_id,
              content: post.caption,
              embeds: freshImage ? [{ image: { url: freshImage } }] : undefined,
            }),
          });
        } else {
          publishRes = await fetch(`${supabaseUrl}/functions/v1/publish-to-social`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              connection_id: post.connection_id,
              image_url: freshImage,
              caption: post.caption,
              scheduled_post_id: post.id,
            }),
          });
        }

        if (publishRes.ok) {
          if (post.platform === "discord") {
            await supabase
              .from("scheduled_posts")
              .update({ status: "published", published_at: new Date().toISOString() })
              .eq("id", post.id);
          }
          processed++;
        } else {
          const errText = await publishRes.text().catch(() => "");
          await supabase
            .from("scheduled_posts")
            .update({ status: "failed", error_message: `HTTP ${publishRes.status}: ${errText.slice(0, 500)}` })
            .eq("id", post.id);
          failed++;
        }
      } catch (e) {
        await supabase
          .from("scheduled_posts")
          .update({
            status: "failed",
            error_message: e instanceof Error ? e.message : String(e),
          })
          .eq("id", post.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        failed,
        undeliverable,
        overdue_notified: overduePending?.length ?? 0,
        total: duePosts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
