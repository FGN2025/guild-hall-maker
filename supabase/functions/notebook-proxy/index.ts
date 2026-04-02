import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Validate that the given api_url is in the admin_notebook_connections allowlist or matches the env default */
async function validateApiUrl(apiUrl: string, defaultUrl: string | undefined): Promise<boolean> {
  // If using the configured default, allow it
  if (defaultUrl && apiUrl.replace(/\/$/, "") === defaultUrl.replace(/\/$/, "")) {
    return true;
  }

  // Check against the allowlist in the database
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data } = await adminClient
    .from("admin_notebook_connections")
    .select("api_url")
    .eq("is_active", true);

  if (!data) return false;

  const normalizedInput = apiUrl.replace(/\/$/, "").toLowerCase();
  return data.some(
    (row: { api_url: string }) => row.api_url.replace(/\/$/, "").toLowerCase() === normalizedInput
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth guard ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const NOTEBOOK_URL = Deno.env.get("OPEN_NOTEBOOK_URL");
    const NOTEBOOK_PASS = Deno.env.get("OPEN_NOTEBOOK_PASSWORD");

    if (!NOTEBOOK_URL) return json({ error: "OPEN_NOTEBOOK_URL not configured" }, 500);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (NOTEBOOK_PASS) headers["Authorization"] = `Bearer ${NOTEBOOK_PASS}`;

    const url = new URL(req.url);

    // Helper to resolve and validate the api_url
    async function resolveBaseUrl(rawUrl: string | null): Promise<string | null> {
      const target = rawUrl || NOTEBOOK_URL!;
      const isAllowed = await validateApiUrl(target, NOTEBOOK_URL);
      if (!isAllowed) return null;
      return target.replace(/\/$/, "");
    }

    // --- GET actions ---
    if (req.method === "GET") {
      const action = url.searchParams.get("action");

      const baseUrl = await resolveBaseUrl(url.searchParams.get("api_url"));
      if (baseUrl === null) {
        return json({ error: "Provided api_url is not in the allowed list" }, 403);
      }

      if (action === "health") {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers });
          const text = await r.text();
          return json({ status: r.ok ? "healthy" : "error", code: r.status, body: text });
        } catch (e) {
          return json({ status: "error", message: e instanceof Error ? e.message : "Connection failed" });
        }
      }

      if (action === "notebooks") {
        const r = await fetch(`${baseUrl}/api/notebooks`, { headers });
        if (!r.ok) {
          const t = await r.text();
          return json({ error: `Upstream error ${r.status}`, detail: t }, r.status);
        }
        const data = await r.json();
        return json(data);
      }

      return json({ error: "Unknown action" }, 400);
    }

    // --- POST actions ---
    if (req.method === "POST") {
      const body = await req.json();
      const { action, api_url } = body;

      const baseUrl = await resolveBaseUrl(api_url || null);
      if (baseUrl === null) {
        return json({ error: "Provided api_url is not in the allowed list" }, 403);
      }

      if (action === "health") {
        try {
          const r = await fetch(`${baseUrl}/health`, { headers });
          const text = await r.text();
          return json({ status: r.ok ? "healthy" : "error", code: r.status, body: text });
        } catch (e) {
          return json({ status: "error", message: e instanceof Error ? e.message : "Connection failed" });
        }
      }

      if (action === "notebooks") {
        const r = await fetch(`${baseUrl}/api/notebooks`, { headers });
        if (!r.ok) { const t = await r.text(); return json({ error: t }, r.status); }
        return json(await r.json());
      }

      if (action === "search") {
        const { query, notebook_id } = body;
        const r = await fetch(`${baseUrl}/api/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ query, notebook_id }),
        });
        if (!r.ok) { const t = await r.text(); return json({ error: t }, r.status); }
        return json(await r.json());
      }

      if (action === "ask") {
        const { question, notebook_id } = body;
        const r = await fetch(`${baseUrl}/api/ask`, {
          method: "POST",
          headers,
          body: JSON.stringify({ question, notebook_id }),
        });
        // Stream SSE back
        return new Response(r.body, {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": r.headers.get("Content-Type") || "text/event-stream" },
        });
      }

      if (action === "sources") {
        const { notebook_id } = body;
        const r = await fetch(`${baseUrl}/api/sources?notebook_id=${encodeURIComponent(notebook_id)}`, { headers });
        if (!r.ok) { const t = await r.text(); return json({ error: t }, r.status); }
        return json(await r.json());
      }

      if (action === "notes") {
        const { notebook_id } = body;
        const r = await fetch(`${baseUrl}/api/notes?notebook_id=${encodeURIComponent(notebook_id)}`, { headers });
        if (!r.ok) { const t = await r.text(); return json({ error: t }, r.status); }
        return json(await r.json());
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("notebook-proxy error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
