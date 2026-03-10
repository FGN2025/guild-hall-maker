import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_ids } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ confirmed: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmed: Record<string, boolean> = {};
    // Batch lookup – admin API doesn't support bulk, so we fetch individually
    // For performance, limit to 100
    const ids = user_ids.slice(0, 100);
    await Promise.all(
      ids.map(async (id: string) => {
        const { data } = await supabase.auth.admin.getUserById(id);
        confirmed[id] = !!data?.user?.email_confirmed_at;
      })
    );

    return new Response(JSON.stringify({ confirmed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
