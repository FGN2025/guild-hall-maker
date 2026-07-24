import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "tenant-marketing";

function extFromContentType(ct: string | null): string {
  if (!ct) return "bin";
  const m = ct.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
    "video/mp4": "mp4",
  };
  return map[m] ?? "bin";
}

function extFromUrl(url: string): string | null {
  try {
    const p = new URL(url).pathname;
    const m = p.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : null;
  } catch { return null; }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Missing bearer token" });
    const jwt = authHeader.slice(7);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(401, { error: "Invalid session" });
    const uid = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { tenant_id, asset_id } = body as { tenant_id?: string; asset_id?: string };
    if (!tenant_id || !asset_id) return json(400, { error: "tenant_id and asset_id required" });

    const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Role check: admin, manager, or marketing on this tenant
    const { data: role } = await svc
      .from("tenant_admins")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", uid)
      .maybeSingle();
    if (!role || !["admin", "manager", "marketing"].includes(role.role)) {
      return json(403, { error: "Not authorized on this tenant" });
    }

    // Idempotent: return existing adoption if present
    const { data: existing } = await svc
      .from("tenant_marketing_assets")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("source_asset_id", asset_id)
      .maybeSingle();
    if (existing) {
      return json(200, { asset: existing, adopted: true, already_adopted: true });
    }

    // Load the source universal asset
    const { data: src, error: srcErr } = await svc
      .from("marketing_assets")
      .select("id, url, label, universal_title, usage_notes, is_universal")
      .eq("id", asset_id)
      .maybeSingle();
    if (srcErr || !src) return json(404, { error: "Source asset not found" });
    if (!src.is_universal) return json(400, { error: "Source asset is not universal" });

    // Download server-side
    const resp = await fetch(src.url, { redirect: "follow" });
    if (!resp.ok) return json(502, { error: `Failed to fetch source asset: HTTP ${resp.status}` });
    const ct = resp.headers.get("content-type");
    const cl = Number(resp.headers.get("content-length") ?? "0");
    if (cl && cl > MAX_BYTES) return json(413, { error: "Source file too large" });
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return json(413, { error: "Source file too large after download" });

    const ext = extFromUrl(src.url) ?? extFromContentType(ct);
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const path = `${tenant_id}/universal/${yyyy}/${mm}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await svc.storage.from(BUCKET).upload(path, buf, {
      contentType: ct ?? "application/octet-stream",
      upsert: false,
    });
    if (upErr) return json(500, { error: `Upload failed: ${upErr.message}` });

    const signTtl = 60 * 60 * 24 * 365;
    const { data: signed, error: signErr } = await svc.storage.from(BUCKET).createSignedUrl(path, signTtl);
    if (signErr || !signed?.signedUrl) return json(500, { error: `Sign failed: ${signErr?.message}` });

    const label = src.universal_title ?? src.label ?? "Universal Asset";
    const fileName = `${label}.${ext}`;

    const { data: row, error: insErr } = await svc
      .from("tenant_marketing_assets")
      .insert({
        tenant_id,
        source_asset_id: asset_id,
        file_name: fileName,
        file_path: path,
        url: signed.signedUrl,
        label,
        notes: src.usage_notes ?? null,
        is_published: false,
        proposed_by: uid,
        created_by: uid,
      })
      .select()
      .single();
    if (insErr) {
      // Race-condition: second adoption inserted after our check. Return the
      // existing row idempotently rather than surfacing the unique-index error.
      const { data: raced } = await svc
        .from("tenant_marketing_assets")
        .select("*")
        .eq("tenant_id", tenant_id)
        .eq("source_asset_id", asset_id)
        .maybeSingle();
      if (raced) return json(200, { asset: raced, adopted: true, already_adopted: true });
      return json(500, { error: insErr.message });
    }

    return json(200, { asset: row, adopted: true, already_adopted: false });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
