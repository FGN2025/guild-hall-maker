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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const NOTEBOOK_URL = Deno.env.get("OPEN_NOTEBOOK_URL");
    const NOTEBOOK_PASS = Deno.env.get("OPEN_NOTEBOOK_PASSWORD");

    if (!NOTEBOOK_URL) return json({ error: "OPEN_NOTEBOOK_URL not configured" }, 500);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (NOTEBOOK_PASS) headers["Authorization"] = `Bearer ${NOTEBOOK_PASS}`;

    const url = new URL(req.url);

    // --- GET actions ---
    if (req.method === "GET") {
      const action = url.searchParams.get("action");

      if (action === "health") {
        const apiUrl = url.searchParams.get("api_url") || NOTEBOOK_URL;
        try {
          const r = await fetch(`${apiUrl.replace(/\/$/, "")}/health`, { headers });
          const text = await r.text();
          return json({ status: r.ok ? "healthy" : "error", code: r.status, body: text });
        } catch (e) {
          return json({ status: "error", message: e instanceof Error ? e.message : "Connection failed" });
        }
      }

      if (action === "notebooks") {
        const apiUrl = url.searchParams.get("api_url") || NOTEBOOK_URL;
        const r = await fetch(`${apiUrl.replace(/\/$/, "")}/api/notebooks`, { headers });
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
      const baseUrl = (api_url || NOTEBOOK_URL).replace(/\/$/, "");

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
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
