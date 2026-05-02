import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Returns Steam achievement schema for a given app id (admin/moderator only).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const appId = url.searchParams.get("appid");
    if (!appId) return j({ error: "appid required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const steamApiKey = Deno.env.get("STEAM_API_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    // Authorize: admin or moderator only
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "moderator");
    if (!allowed) return j({ error: "Forbidden" }, 403);

    const steamUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}`;
    const res = await fetch(steamUrl);
    const data = await res.json().catch(() => null);
    const achievements =
      data?.game?.availableGameStats?.achievements?.map((a: any) => ({
        api_name: a.name,
        display_name: a.displayName,
        description: a.description ?? null,
        icon: a.icon ?? null,
        hidden: a.hidden === 1,
      })) ?? [];

    return j({ achievements });
  } catch (err) {
    return j({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
