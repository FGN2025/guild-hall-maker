import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMeTool from "./tools/get-me";
import listTournamentsTool from "./tools/list-tournaments";
import listChallengesTool from "./tools/list-challenges";
import getChallengeTool from "./tools/get-challenge";
import listGamesTool from "./tools/list-games";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time so it stays import-safe — no runtime env read at module load).
// Must be the direct supabase.co host, never a lovable.cloud proxy URL.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fgn-mcp",
  title: "FGN Gaming Network",
  version: "0.1.0",
  instructions:
    "Read-only tools for the FGN gaming platform. Use `get_me` for the signed-in player's profile, `list_tournaments` for tournaments, `list_challenges` / `get_challenge` for challenges and their tasks, and `list_games` for the games catalog.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMeTool, listTournamentsTool, listChallengesTool, getChallengeTool, listGamesTool],
});
