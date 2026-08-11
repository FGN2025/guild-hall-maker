import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * READ-ONLY pre-flight for the first live publish.
 *  - Graph GET (no publish) to prove the stored page token still authenticates.
 *  - Signs the post's storage object to prove the bytes are still there.
 * Writes nothing, publishes nothing, and never returns the token itself.
 */
const POST_ID = "a7626c30-d7de-45fb-a094-030aa8af3883";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: post } = await supabase
    .from("scheduled_posts")
    .select("id, status, scheduled_at, platform, caption, image_path, connection_id, asset_id")
    .eq("id", POST_ID)
    .maybeSingle();
  if (!post) {
    return new Response(JSON.stringify({ ok: false, error: "post not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: conn } = await supabase
    .from("social_connections")
    .select("id, platform, account_name, account_id, is_active, expires_at, access_token")
    .eq("id", post.connection_id)
    .maybeSingle();

  // --- Graph read call, explicitly not a publish -----------------------------
  let graph: Record<string, unknown> = { attempted: false };
  if (conn?.access_token) {
    const url = `https://graph.facebook.com/v21.0/${conn.account_id}?fields=id,name,fan_count&access_token=${encodeURIComponent(conn.access_token)}`;
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    graph = {
      attempted: true,
      method: "GET",
      endpoint: `https://graph.facebook.com/v21.0/${conn.account_id}?fields=id,name,fan_count`,
      http_status: res.status,
      authenticated: res.ok,
      response: body,
    };
  }

  // --- Storage object still present and still signable ----------------------
  const { data: signed, error: signErr } = await supabase.storage
    .from("tenant-marketing")
    .createSignedUrl(post.image_path!, 300);
  let bytes: number | null = null;
  let head_status: number | null = null;
  if (signed?.signedUrl) {
    const h = await fetch(signed.signedUrl, { method: "HEAD" });
    head_status = h.status;
    bytes = Number(h.headers.get("content-length") ?? 0) || null;
  }

  return new Response(JSON.stringify({
    ok: true,
    post: {
      id: post.id, status: post.status, scheduled_at: post.scheduled_at,
      platform: post.platform, asset_id: post.asset_id, image_path: post.image_path,
    },
    caption_verbatim: post.caption,
    connection: conn
      ? { id: conn.id, platform: conn.platform, account_name: conn.account_name,
          account_id: conn.account_id, is_active: conn.is_active, expires_at: conn.expires_at }
      : null,
    graph,
    storage: { signed: !!signed?.signedUrl, sign_error: signErr?.message ?? null, head_status, bytes },
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
