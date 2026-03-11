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

    for (const post of duePosts) {
      try {
        // Call publish-to-social for each post
        const publishRes = await fetch(`${supabaseUrl}/functions/v1/publish-to-social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            connection_id: post.connection_id,
            image_url: post.image_url,
            caption: post.caption,
            scheduled_post_id: post.id,
          }),
        });

        if (publishRes.ok) {
          processed++;
        } else {
          failed++;
        }
      } catch (e) {
        // Mark as failed
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
