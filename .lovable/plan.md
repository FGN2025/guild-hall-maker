## Problem

Claude hits `https://play.fgn.gg/.lovable/oauth/consent?authorization_id=...` and sees the app's 404. The consent route exists in `src/App.tsx` (line 158) and `src/pages/OAuthConsent.tsx` was added in the previous MCP turn — but that code has not been shipped to the live custom domain. The published build at `play.fgn.gg` is from before the MCP work, so React Router there has no `/.lovable/oauth/consent` route and falls through to NotFound.

## Fix

Republish the project. No code changes needed — the route, consent page, and OAuth wiring are already correct in the current source.

## Steps

1. Run `preview_ui--publish` to ship the current build to `play.fgn.gg` (and the other custom domains + `guild-hall-maker.lovable.app`).
2. After publish completes (~1 min), retry the Claude "Add MCP" flow. Claude will re-hit `play.fgn.gg/.lovable/oauth/consent?authorization_id=...`, the new build will render the consent screen, and approve/deny will redirect back to Claude with a code.

## If it still 404s after republish

Then the issue is not staleness. Likely follow-ups to check:
- Supabase Auth **Site URL** — must point at `https://play.fgn.gg` (the origin Claude is being redirected to). If it points at the lovable.app preview, the consent redirect works but from a different origin than Claude expects.
- The `/.lovable/...` path segment is served by Lovable's SPA fallback correctly (no extension, so it falls back to `index.html`) — confirmed by the fact that the app's own NotFound renders, meaning `index.html` did load.

But start with the republish; that is almost certainly the whole fix.