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
    const supabase = createClient(supabaseUrl, serviceKey);

    const { connection_id, image_url, caption, scheduled_post_id } = await req.json();

    // Fetch connection
    const { data: conn, error: connErr } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("is_active", true)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let postUrl: string | null = null;
    let errorMessage: string | null = null;

    try {
      switch (conn.platform) {
        case "twitter": {
          // Twitter/X API v2 - media upload + tweet
          // Note: Full implementation requires OAuth 1.0a signing
          // This is a simplified version using Bearer Token for text-only tweets
          const tweetRes = await fetch("https://api.x.com/2/tweets", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: caption || "",
            }),
          });
          const tweetData = await tweetRes.json();
          if (tweetData.data?.id) {
            postUrl = `https://x.com/i/status/${tweetData.data.id}`;
          } else {
            throw new Error(tweetData.detail || tweetData.title || "Tweet failed");
          }
          break;
        }

        case "facebook": {
          const pageId = conn.page_id || "me";
          const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/photos`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: image_url,
                message: caption || "",
                access_token: conn.access_token,
              }),
            }
          );
          const fbData = await fbRes.json();
          if (fbData.id) {
            postUrl = `https://facebook.com/${fbData.id}`;
          } else {
            throw new Error(fbData.error?.message || "Facebook post failed");
          }
          break;
        }

        case "instagram": {
          // Instagram Graph API - container-based publishing
          const pageId = conn.page_id;
          if (!pageId) throw new Error("Instagram requires a linked Page ID");

          // Step 1: Create media container
          const containerRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/media`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image_url,
                caption: caption || "",
                access_token: conn.access_token,
              }),
            }
          );
          const containerData = await containerRes.json();
          if (!containerData.id) throw new Error(containerData.error?.message || "Container creation failed");

          // Step 2: Publish
          const publishRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/media_publish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: containerData.id,
                access_token: conn.access_token,
              }),
            }
          );
          const publishData = await publishRes.json();
          if (publishData.id) {
            postUrl = `https://instagram.com/p/${publishData.id}`;
          } else {
            throw new Error(publishData.error?.message || "Instagram publish failed");
          }
          break;
        }

        case "linkedin": {
          const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
              author: "urn:li:person:me",
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: caption || "" },
                  shareMediaCategory: "ARTICLE",
                  media: [
                    {
                      status: "READY",
                      originalUrl: image_url,
                    },
                  ],
                },
              },
              visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
              },
            }),
          });
          const liData = await liRes.json();
          if (liData.id) {
            postUrl = `https://linkedin.com/feed/update/${liData.id}`;
          } else {
            throw new Error(JSON.stringify(liData));
          }
          break;
        }

        default:
          throw new Error(`Unsupported platform: ${conn.platform}`);
      }
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    // Update scheduled_post if this was triggered by scheduler
    if (scheduled_post_id) {
      await supabase
        .from("scheduled_posts")
        .update({
          status: errorMessage ? "failed" : "published",
          published_at: errorMessage ? null : new Date().toISOString(),
          post_url: postUrl,
          error_message: errorMessage,
        })
        .eq("id", scheduled_post_id);
    }

    return new Response(
      JSON.stringify({
        success: !errorMessage,
        post_url: postUrl,
        error: errorMessage,
      }),
      {
        status: errorMessage ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
