# Make Discord linking optional

Remove the mandatory Discord-link gate. Users can still link Discord voluntarily from `/link-discord` (entry points in profile/navbar stay), and the OAuth flow, role assignment, and admin bypass review system remain functional.

## Code changes

1. **`src/components/ConditionalLayout.tsx`** — drop the `!discordLinked` check and its redirect to `/link-discord`. After email confirmation, render `AppLayout` directly.

2. **`src/components/ProtectedRoute.tsx`** — remove the Discord gate block and the `DISCORD_EXEMPT_PATHS` constant. Only auth + email-confirmed checks remain.

3. **`src/pages/Auth.tsx` and onboarding flows** — audit for any post-signup `navigate("/link-discord")` and remove. (Quick grep; expected to be minimal.)

4. **Navbar / Profile** — leave the "Link Discord" CTA visible so users can opt in.

## Memory updates

- Edit `mem://auth/discord-verification-logic` to state linking is optional; bypass-request flow is no longer required for access (kept for legacy data).
- Edit Core in `mem://index.md`: remove the "Staff are globally exempt from Discord linking" clause (no longer meaningful since nobody is gated).

## Untouched

- `/link-discord` page, `discord-oauth-callback` edge function, Discord role mappings, bot integration.
- `discord_bypass_requests` table and admin review UI (safe to leave; can be retired later).
- Domain/cutover work — separate plan.
