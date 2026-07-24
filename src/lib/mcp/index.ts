import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { tools } from "../../../supabase/functions/_shared/mcp-tools/_registry.ts";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time so it stays import-safe — no runtime env read at module load).
// Must be the direct supabase.co host, never a lovable.cloud proxy URL.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-mcp",
  title: "FGN Gaming Network",
  version: "0.1.0",
  instructions:
    "Tools for the FGN gaming platform. Read-only: `get_me`, `list_tournaments`, `list_challenges`/`get_challenge`, `list_games`, `list_tenants`, `get_brand_kit`, `list_upcoming_events`, `list_platform_templates`, `list_tenant_assets`, `list_pending_agent_drafts`. Marketing agent (drafts only — nothing publishes without tenant admin approval): `create_campaign_draft`, `update_campaign_draft`, `attach_tenant_asset_draft` (downloads external URLs server-side into tenant storage), `propose_scheduled_post`, `update_scheduled_post`. Each turn: call `list_pending_agent_drafts` first and revise rejected work (address feedback_note) before proposing new drafts. Use `idempotency_key` on create/propose calls so retries never duplicate.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools,
});
