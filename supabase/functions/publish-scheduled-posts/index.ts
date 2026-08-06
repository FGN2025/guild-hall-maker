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

    /** Durable image resolution.
     *  A signed URL is a cache, never the source of truth. We mint a fresh one
     *  from the canonical object path, preferring (1) scheduled_posts.image_path,
     *  (2) the linked asset's file_path, (3) a path parsed out of the stored URL.
     *  Only if all three miss do we fall back to the stored (possibly expired) URL. */
    async function resolveObjectPath(post: any): Promise<string | null> {
      if (post.image_path) return post.image_path;
      if (post.asset_id) {
        const { data } = await supabase
          .from("tenant_marketing_assets")
          .select("file_path")
          .eq("id", post.asset_id)
          .maybeSingle();
        if (data?.file_path) return data.file_path;
      }
      const raw: string | null = post.image_url ?? null;
      if (!raw) return null;
      const marker = "/tenant-marketing/";
      const idx = raw.indexOf(marker);
      if (idx === -1) return null;
      let objectPath = raw.slice(idx + marker.length);
      const q = objectPath.indexOf("?");
      if (q !== -1) objectPath = objectPath.slice(0, q);
      return decodeURIComponent(objectPath);
    }

    async function resolveImageUrl(post: any): Promise<string | null> {
      const objectPath = await resolveObjectPath(post);
      if (!objectPath) return post.image_url ?? null;
      const { data, error } = await supabase.storage
        .from("tenant-marketing")
        .createSignedUrl(objectPath, 60 * 60);
      if (error || !data?.signedUrl) {
        console.warn(`[publish] could not sign ${objectPath}: ${error?.message ?? "no url"}`);
        return post.image_url ?? null;
      }
      // Backfill the canonical path so the next dispatch skips the parse.
      if (!post.image_path) {
        await supabase.from("scheduled_posts").update({ image_path: objectPath }).eq("id", post.id);
      }
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
      // Deterministic when multiple actives exist: prefer the most recently
      // created active connection and warn so stale rows get cleaned up.
      const { data } = await supabase
        .from("social_connections")
        .select("id, created_at")
        .eq("tenant_id", tenantId)
        .eq("platform", platform)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data && data.length) {
        if (data.length > 1) {
          console.warn(
            `Multiple active ${platform} connections for tenant ${tenantId} (${data.length}); using newest ${data[0].id}`,
          );
        }
        return { id: data[0].id };
      }
      return null;
    }

    for (const post of duePosts) {
      try {
        // Resolve active connection for non-discord posts. If the row has a
        // connection_id, validate it; otherwise fall back to the single active
        // (tenant_id, platform) connection. Backfill the row so the linkage
        // persists for audit and any retries.
        let resolvedConn: { id: string } | null = null;
        if (post.platform !== "discord") {
          resolvedConn = await resolveActiveConnection(
            post.tenant_id,
            post.platform,
            post.connection_id,
          );
          if (!resolvedConn) {
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
          // Backfill: if the row had a null/stale connection_id, persist the
          // resolved id so future retries and the audit trail agree.
          if (post.connection_id !== resolvedConn.id) {
            await supabase
              .from("scheduled_posts")
              .update({ connection_id: resolvedConn.id })
              .eq("id", post.id);
            post.connection_id = resolvedConn.id;
          }
        }

        const freshImage = await resolveImageUrl(post);
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
              connection_id: resolvedConn!.id,
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
          const errMessage = `HTTP ${publishRes.status}: ${errText.slice(0, 500)}`;

          // Detect Facebook/Instagram Graph OAuthException code 190 (expired
          // or invalid token). Deactivate the stored credential and mark the
          // post as an actionable token_expired failure.
          let tokenExpired = false;
          try {
            const parsed = JSON.parse(errText);
            const gErr = parsed?.error ?? parsed?.graph_error ?? null;
            if (gErr && typeof gErr === "object" && (gErr.code === 190 || gErr.type === "OAuthException")) {
              tokenExpired = true;
            } else if (typeof gErr === "string" && /session has expired|oauthexception|access token|error validating access token/i.test(gErr)) {
              tokenExpired = true;
            }
          } catch (_) { /* not JSON */ }
          if (!tokenExpired && /session has expired|oauthexception|error validating access token/i.test(errText)) {
            tokenExpired = true;
          }

          if (tokenExpired && resolvedConn) {
            await supabase
              .from("social_connections")
              .update({ is_active: false })
              .eq("id", resolvedConn.id);
            await supabase
              .from("scheduled_posts")
              .update({
                status: "failed",
                error_message: errMessage,
                undeliverable_reason: "token_expired",
              })
              .eq("id", post.id);
            await supabase.rpc("enqueue_marketing_notification", {
              _tenant_id: post.tenant_id,
              _category: "dispatch_error",
              _related_kind: "scheduled_post",
              _related_id: post.id,
              _title: `${post.platform} token expired`,
              _message: `The stored ${post.platform} credential has expired or been revoked. Reconnect ${post.platform} in Marketing → Connections and republish.`,
              _link: "/tenant/marketing?tab=connections",
              _agent_source: post.agent_source,
              _payload: { id: post.id, platform: post.platform, reason: "token_expired" },
            });
          } else {
            await supabase
              .from("scheduled_posts")
              .update({ status: "failed", error_message: errMessage })
              .eq("id", post.id);
          }
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
