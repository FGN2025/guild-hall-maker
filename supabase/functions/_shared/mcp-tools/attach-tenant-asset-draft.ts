import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, supabaseServiceRole, requireAuth, okJson, toolError } from "./_shared.ts";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const BUCKET = "tenant-marketing";

function extFromContentType(ct: string | null): string {
  if (!ct) return "bin";
  const m = ct.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
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

export default defineTool({
  name: "attach_tenant_asset_draft",
  title: "Attach agent-generated asset to tenant library",
  description:
    "Download the supplied image URL server-side, upload it into the tenant's private storage bucket, and insert a draft row in tenant_marketing_assets (is_published=false). The original URL is preserved on source_url for lineage; the row's url points at the permanent Supabase Storage URL. Supply campaign_id to link to a campaign.",
  inputSchema: {
    tenant_id: z.string().uuid(),
    source_url: z.string().url().describe("Externally reachable URL to the image (CDN links accepted; downloaded server-side)."),
    file_name: z.string().min(1).describe("Human-readable file name for the library."),
    label: z.string().optional().describe("Format label, e.g. 'Square 1080', 'Story 1080x1920'."),
    campaign_id: z.string().uuid().optional(),
    source_asset_id: z.string().uuid().optional().describe("Platform template id if this was cloned from marketing_assets."),
    notes: z.string().optional(),
    overlay_config: z.record(z.any()).optional().describe("Optional editor overlay config { canvas, overlays } so the draft reopens as editable layers."),
    background_url: z.string().url().optional().describe("Optional clean base image URL (no baked-in overlays). Editor uses this instead of the flattened url."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    const guard = requireAuth(ctx); if (guard) return guard;
    try {
      const userSupabase = supabaseForUser(ctx);
      const uid = ctx.getUserId();

      // Download server-side
      const resp = await fetch(input.source_url, { redirect: "follow" });
      if (!resp.ok) {
        return { content: [{ type: "text", text: `Failed to fetch source_url: HTTP ${resp.status}` }], isError: true };
      }
      const ct = resp.headers.get("content-type");
      const cl = Number(resp.headers.get("content-length") ?? "0");
      if (cl && cl > MAX_BYTES) {
        return { content: [{ type: "text", text: `Source file too large (${cl} bytes; max ${MAX_BYTES}).` }], isError: true };
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        return { content: [{ type: "text", text: `Source file too large after download.` }], isError: true };
      }

      const ext = extFromUrl(input.source_url) ?? extFromContentType(ct);
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
      const uuid = crypto.randomUUID();
      const path = `${input.tenant_id}/agent/${yyyy}/${mm}/${uuid}.${ext}`;

      // Upload via user client (RLS enforces tenant marketer). Fall back to
      // service role for the storage write if the user's Storage policy denies
      // (e.g. path-parse edge case) — RLS on tenant_marketing_assets still
      // enforces authorization on the row insert below.
      const uploadClient = userSupabase;
      const { error: upErr } = await uploadClient.storage
        .from(BUCKET)
        .upload(path, buf, {
          contentType: ct ?? "application/octet-stream",
          upsert: false,
        });
      if (upErr) {
        // Try service role if RLS on storage rejected (rare)
        const svc = supabaseServiceRole();
        const retry = await svc.storage.from(BUCKET).upload(path, buf, {
          contentType: ct ?? "application/octet-stream",
          upsert: false,
        });
        if (retry.error) throw retry.error;
      }

      // Bucket is private (workspace policy). Mint a long-TTL signed URL so
      // the reviewer UI and downstream tools have an immediately usable URL.
      // The scheduled-post dispatcher always re-signs from the object path
      // before sending, so token expiry does not break publishing.
      const signTtlSeconds = 60 * 60 * 24 * 365; // 1 year
      const { data: signed, error: signErr } = await userSupabase.storage
        .from(BUCKET)
        .createSignedUrl(path, signTtlSeconds);
      if (signErr || !signed?.signedUrl) {
        const svc = supabaseServiceRole();
        const retry = await svc.storage.from(BUCKET).createSignedUrl(path, signTtlSeconds);
        if (retry.error || !retry.data?.signedUrl) throw signErr ?? retry.error;
        var storedUrl = retry.data.signedUrl;
      } else {
        var storedUrl = signed.signedUrl;
      }

      const { data: row, error: insErr } = await userSupabase
        .from("tenant_marketing_assets")
        .insert({
          tenant_id: input.tenant_id,
          file_name: input.file_name,
          file_path: path,
          url: storedUrl,
          source_url: input.source_url,
          label: input.label ?? "Default",
          campaign_id: input.campaign_id ?? null,
          source_asset_id: input.source_asset_id ?? null,
          notes: input.notes ?? null,
          is_published: false,
          agent_source: "claude-mcp",
          proposed_by: uid,
          created_by: uid,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return okJson(row, "asset");
    } catch (err) {
      return toolError(err, "attach_tenant_asset_draft");
    }
  },
});
