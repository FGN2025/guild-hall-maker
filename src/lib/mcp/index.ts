import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { tools } from "../../../supabase/functions/_shared/mcp-tools/_registry.ts";
import { BUILD_ID } from "../../../supabase/functions/_shared/build-id.ts";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time so it stays import-safe — no runtime env read at module load).
// Must be the direct supabase.co host, never a lovable.cloud proxy URL.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-mcp",
  title: "FGN Gaming Network",
  version: "0.1.0",
  instructions:
    "Tools for the FGN gaming platform. Read-only: `get_me`, `list_tournaments`, `list_challenges`/`get_challenge`, `list_games`, `list_tenants`, `get_brand_kit`, `list_upcoming_events`, `get_calendar_image` (platform monthly calendar poster for a year/month, returns null when none exists), `list_platform_templates` (pass `tenant_id` to see per-tenant `adopted` / `adopted_asset_id`; use `universal_only=true` for platform-wide universal assets), `list_tenant_assets`, `list_pending_agent_drafts`. Marketing agent (drafts only — nothing publishes without tenant admin approval): `create_campaign_draft`, `update_campaign_draft`, `attach_tenant_asset_draft` (downloads external URLs server-side into tenant storage; use the `url` of an unadopted universal asset as `source_url` and pass its id as `source_asset_id` to localize it into the tenant library), `compose_event_promo` (deterministic server-side promo composition from a published tournament or tenant event — the calendar-seed lane's only image source), `propose_scheduled_post`, `update_scheduled_post`. Slate runs: prefer proposing localized treatments of unadopted universal assets before generating new imagery. Each turn: call `list_pending_agent_drafts` first and revise rejected work (address feedback_note) before proposing new drafts. Use `idempotency_key` on create/propose calls so retries never duplicate.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
    // The SDK owns this function's routing, so the RFC 9728 metadata document
    // (the one unauthenticated GET path) carries the deploy stamp. Probe:
    // GET /functions/v1/mcp/.well-known/oauth-protected-resource
    resourceDocumentation: `https://fgn.gg/docs/mcp#build=${BUILD_ID}`,
  }),
  tools,
});
