# Discord link 409 — diagnose and surface the conflicting account

## What the logs show

- `discord-oauth-callback` returned **409** at 02:30:47 UTC on Aug 25. Token exchange and the Discord user fetch both succeeded — the failure is entirely in our own duplicate check.
- The function blocks the link when the returned Discord ID already exists on another profile, and responds with the generic text "This Discord account is already linked to another player."
- `darcy@fgn.gg` (RacerX) still has no Discord ID stored, so nothing was written; the account is unlinked, not half-linked.
- Because the 409 branch logs nothing, we cannot tell from the logs which Discord account was returned or which profile holds it. Signing in to Discord by phone number means Discord may have resolved a different personal account than expected, which is a likely explanation but is not confirmed.

## What to build

1. **Log the conflict.** On the 409 branch, log the incoming Discord ID, Discord username, the attempting user ID, and the conflicting profile's user ID. No tokens, no emails in logs.
2. **Name the holder in the response.** Return the conflicting profile's display name and a masked email (for example `d****y@f***.gg`) alongside the error, so the person hitting it knows which account to sign into or hand to support.
3. **Show it in the UI.** Update the Discord link screen to render the richer message: "This Discord account (`<username>`) is already linked to `<display name>` (`<masked email>`). Sign in as that account, or contact support to move the link."
4. **Admin lookup aid.** Add a small platform-admin-only view of the conflict to the Discord admin area: given a Discord username or ID, show which profile holds it. Read-only, admin-gated.

No auto-transfer and no forced unlink — the block stays, per the chosen outcome.

## Technical notes

- Change is confined to `supabase/functions/discord-oauth-callback/index.ts` (the existing 409 branch, lines around 127-140) plus the caller in `src/pages/LinkDiscord.tsx`.
- The existing check already runs on the service-role client, so reading `display_name` and the auth email for the conflicting user needs no new privileges; mask the email before it leaves the function.
- Response shape stays `{ error: string }` with two new optional fields (`conflictDisplayName`, `conflictEmailMasked`, `discordUsername`) so any other caller keeps working.
- The admin lookup can reuse the existing admin gating pattern used by `discord-server-roles`.

## After deploy

Retry the link from `darcy@fgn.gg`. The 409, if it recurs, will name the account holding the Discord ID and the logs will carry the ID for a one-off data correction.
