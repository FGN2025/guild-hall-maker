import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { user_ids, mode } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ confirmed: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all IDs are UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = user_ids.filter((id: unknown) => typeof id === "string" && uuidRegex.test(id));
    if (validIds.length === 0) {
      return new Response(JSON.stringify({ confirmed: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Mode: "self_check" — only returns confirmed status for a single user, no email ---
    // Used by Auth.tsx during signup to check if an account is already confirmed
    if (mode === "self_check") {
      if (validIds.length !== 1) {
        return new Response(JSON.stringify({ error: "self_check supports exactly one user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await adminClient.auth.admin.getUserById(validIds[0]);
      return new Response(
        JSON.stringify({ confirmed: { [validIds[0]]: !!data?.user?.email_confirmed_at } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Full mode: requires admin auth — returns emails, confirmation, etc. ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Verify caller is admin or moderator
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confirmed: Record<string, boolean> = {};
    const has_email: Record<string, boolean> = {};
    const emails: Record<string, string> = {};
    const ids = validIds.slice(0, 100);

    await Promise.all(
      ids.map(async (id: string) => {
        const { data } = await adminClient.auth.admin.getUserById(id);
        confirmed[id] = !!data?.user?.email_confirmed_at;
        has_email[id] = !!data?.user?.email;
        if (data?.user?.email) emails[id] = data.user.email;
      })
    );

    return new Response(JSON.stringify({ confirmed, has_email, emails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
