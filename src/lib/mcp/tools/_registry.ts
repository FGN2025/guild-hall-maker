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

import getMeTool from "./get-me";
import listTournamentsTool from "./list-tournaments";
import listChallengesTool from "./list-challenges";
import getChallengeTool from "./get-challenge";
import listGamesTool from "./list-games";
import listTenantsTool from "./list-tenants";
import getBrandKitTool from "./get-brand-kit";
import listUpcomingEventsTool from "./list-upcoming-events";
import listPlatformTemplatesTool from "./list-platform-templates";
import listTenantAssetsTool from "./list-tenant-assets";
import listPendingAgentDraftsTool from "./list-pending-agent-drafts";
import createCampaignDraftTool from "./create-campaign-draft";
import updateCampaignDraftTool from "./update-campaign-draft";
import attachTenantAssetDraftTool from "./attach-tenant-asset-draft";
import proposeScheduledPostTool from "./propose-scheduled-post";
import updateScheduledPostTool from "./update-scheduled-post";

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
]);
