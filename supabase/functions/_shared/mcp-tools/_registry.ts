// Single source of truth for the MCP tool set. Both entry points MUST import
// from here so a tool added or changed in one place flows to both endpoints
// with zero extra steps:
//   - src/lib/mcp/index.ts       → OAuth-verified public `mcp` function
//                                   (Streamable HTTP, real user sessions)
//   - supabase/functions/agent-mcp/index.ts
//                                → HS256 runner-token-verified `agent-mcp`
//                                   function (marketing agent runner only)
//
// Do NOT hand-maintain a duplicate list in agent-mcp. If you add a tool file,
// add it here.

import getMeTool from "./get-me.ts";
import listTournamentsTool from "./list-tournaments.ts";
import listChallengesTool from "./list-challenges.ts";
import getChallengeTool from "./get-challenge.ts";
import listGamesTool from "./list-games.ts";
import listTenantsTool from "./list-tenants.ts";
import getBrandKitTool from "./get-brand-kit.ts";
import listUpcomingEventsTool from "./list-upcoming-events.ts";
import listPlatformTemplatesTool from "./list-platform-templates.ts";
import listTenantAssetsTool from "./list-tenant-assets.ts";
import listPendingAgentDraftsTool from "./list-pending-agent-drafts.ts";
import createCampaignDraftTool from "./create-campaign-draft.ts";
import updateCampaignDraftTool from "./update-campaign-draft.ts";
import attachTenantAssetDraftTool from "./attach-tenant-asset-draft.ts";
import proposeScheduledPostTool from "./propose-scheduled-post.ts";
import updateScheduledPostTool from "./update-scheduled-post.ts";
import listBrandedPagesTool from "./list-branded-pages.ts";
import listPageTemplatesTool from "./list-page-templates.ts";
import proposeBrandedPageTool from "./propose-branded-page.ts";
import proposePortalBannerUpdateTool from "./propose-portal-banner-update.ts";
import composeEventPromoTool from "./compose-event-promo.ts";
import getCalendarImageTool from "./get-calendar-image.ts";


export const tools = [
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
  listBrandedPagesTool,
  listPageTemplatesTool,
  proposeBrandedPageTool,
  proposePortalBannerUpdateTool,
  composeEventPromoTool,
  getCalendarImageTool,
];

// Names of write tools — used by agent-mcp for the tool-boundary tenant guard.
// (Read tools with a `tenant_id` param are also boundary-checked by presence
// of that key at dispatch time; this list is just for documentation / audit.)
export const WRITE_TOOL_NAMES = new Set([
  "create_campaign_draft",
  "update_campaign_draft",
  "attach_tenant_asset_draft",
  "propose_scheduled_post",
  "update_scheduled_post",
  "propose_branded_page",
  "propose_portal_banner_update",
]);
