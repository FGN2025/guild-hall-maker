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

    // Scheduler-only: require service role bearer.
    if ((req.headers.get("Authorization") || "") !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Find posts due for publishing
    const { data: duePosts, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (error) throw error;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let failed = 0;

    // Refresh signed URLs for private tenant-marketing bucket assets so tokens
    // never go stale between attach and publish.
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

    for (const post of duePosts) {
      try {
        const freshImage = await resolveImageUrl(post.image_url);
        let publishRes: Response;

        if (post.platform === "discord") {
          publishRes = await fetch(`${supabaseUrl}/functions/v1/discord-send-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
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
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
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
      JSON.stringify({ processed, failed, total: duePosts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
