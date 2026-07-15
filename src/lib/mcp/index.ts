import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMeTool from "./tools/get-me";
import listTournamentsTool from "./tools/list-tournaments";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time so it stays import-safe — no runtime env read at module load).
// Must be the direct supabase.co host, never a lovable.cloud proxy URL.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-mcp",
  title: "FGN Gaming Network",
  version: "0.1.0",
  instructions:
    "Tools for the FGN gaming platform. Use `get_me` to fetch the signed-in player's profile and points, and `list_tournaments` to see tournaments visible to that player.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMeTool, listTournamentsTool],
});
