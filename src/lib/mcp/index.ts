import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMeTool from "./tools/get-me";
import listTournamentsTool from "./tools/list-tournaments";
import listChallengesTool from "./tools/list-challenges";
import getChallengeTool from "./tools/get-challenge";
import listGamesTool from "./tools/list-games";
import listTenantsTool from "./tools/list-tenants";
import getBrandKitTool from "./tools/get-brand-kit";
import listUpcomingEventsTool from "./tools/list-upcoming-events";
import listPlatformTemplatesTool from "./tools/list-platform-templates";
import listTenantAssetsTool from "./tools/list-tenant-assets";
import listPendingAgentDraftsTool from "./tools/list-pending-agent-drafts";
import createCampaignDraftTool from "./tools/create-campaign-draft";
import updateCampaignDraftTool from "./tools/update-campaign-draft";
import attachTenantAssetDraftTool from "./tools/attach-tenant-asset-draft";
import proposeScheduledPostTool from "./tools/propose-scheduled-post";
import updateScheduledPostTool from "./tools/update-scheduled-post";

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
  tools: [
    getMeTool,
    listTournamentsTool,
    listChallengesTool,
    getChallengeTool,
    listGamesTool,
    listTenantsTool,
    getBrandKitTool,
    listUpcomingEventsTool,
    listPlatformTemplatesTool,
    listTenantAssetsTool,
    listPendingAgentDraftsTool,
    createCampaignDraftTool,
    updateCampaignDraftTool,
    attachTenantAssetDraftTool,
    proposeScheduledPostTool,
    updateScheduledPostTool,
  ],
});
