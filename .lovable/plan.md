

## Assign Discord Roles on Tournament Registration

### Level of Effort: **Medium** (~3-4 changes)

The existing infrastructure already handles Discord role assignment (bot token, guild ID, role mappings table, and the assignment logic in `discord-oauth-callback`). The main work is wiring a per-tournament role selection into the create/edit flows and triggering assignment on registration.

### What Needs to Change

**1. Database: Add `discord_role_id` column to `tournaments` table**
- A nullable `text` column storing the Discord role ID to assign when a player registers.
- Single migration, no RLS changes needed (existing tournament policies cover it).

**2. Create/Edit Tournament Dialogs — Add Discord Role Picker**
- Add an optional "Discord Role" dropdown to both `CreateTournamentDialog` and `EditTournamentDialog`.
- On dialog open, fetch available server roles via `supabase.functions.invoke("discord-server-roles")` (already built and admin-gated).
- Pass `discord_role_id` through `onCreate` / `onUpdate` to persist it on the tournament record.

**3. Registration Hook — Assign Role on Register**
- In `useTournaments.ts` `registerMutation`, after inserting the registration row:
  - Fetch the tournament's `discord_role_id`.
  - If set, fetch the user's `discord_id` from their profile.
  - Call the Discord API to assign the role. This should happen server-side, so create a small edge function `assign-discord-role` (or extend the existing registration logic) that accepts `{ user_id, discord_role_id }` and uses the bot token to assign the role.
- Alternatively, add this logic to a new lightweight edge function `assign-tournament-role` that the frontend invokes after successful registration.

**4. New Edge Function: `assign-tournament-role`**
- Accepts `{ tournament_id, user_id }`.
- Validates the user is actually registered for that tournament.
- Looks up `tournaments.discord_role_id` and `profiles.discord_id`.
- Calls `PUT /guilds/{guild}/members/{discord_id}/roles/{role_id}` using the bot token.
- Returns success/failure (non-blocking — registration still succeeds even if role assignment fails).

### Files to Create/Modify
- **Migration**: Add `discord_role_id text` to `tournaments`
- **New**: `supabase/functions/assign-tournament-role/index.ts`
- **Edit**: `src/components/tournaments/CreateTournamentDialog.tsx` — add role dropdown
- **Edit**: `src/components/tournaments/EditTournamentDialog.tsx` — add role dropdown
- **Edit**: `src/hooks/useTournaments.ts` — call edge function after registration insert

### What Already Exists (No Changes Needed)
- `discord-server-roles` edge function (fetches available roles from the server)
- `discord_role_mappings` table and `DiscordRoleManager` UI (separate system for link-time roles)
- Bot token and guild ID secrets
- Discord role assignment pattern (proven in `discord-oauth-callback`)

