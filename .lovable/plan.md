

## Current Discord Linking Flow — Documentation

Here is exactly what happens when a user links their Discord account:

### Step-by-step Flow

1. **User clicks "Link Discord Account"** on `/link-discord` (or Profile Settings)
2. **Redirect to Discord OAuth** with `identify` scope only — Discord prompts the user to authorize
3. **Discord redirects back** with an authorization `code`
4. **`discord-oauth-callback` edge function** processes the code:
   - Exchanges the code for an access token with Discord API
   - Fetches the user's Discord profile (`/users/@me`) — gets `id`, `username`, `avatar`
   - Checks the Discord ID isn't already linked to another platform account
   - Updates the user's `profiles` row with `discord_id`, `discord_username`, `discord_avatar`, `discord_linked_at`
   - **Assigns a single Discord server role**: Uses the Discord Bot API to add the role specified by `DISCORD_VERIFIED_ROLE_ID` to the user in the guild specified by `DISCORD_GUILD_ID`
5. **Frontend** shows success, refreshes auth context, redirects to Dashboard

### Current Limitation

The system only assigns **one hardcoded role** (`DISCORD_VERIFIED_ROLE_ID`). There is no mechanism to:
- Choose which Discord role(s) to assign from the Fiber Gaming Network server
- Map platform roles/tiers to different Discord roles
- Allow admins to configure role assignments from the UI

### Recommended Plan: Configurable Discord Role Assignment

To enable choosing roles from the FGN Discord server, here's what to build:

**1. Database: `discord_role_mappings` table**
- Columns: `id`, `discord_role_id` (text), `discord_role_name` (text), `trigger_condition` (enum: `on_link`, `on_achievement`, `on_rank`, etc.), `condition_value` (text, nullable), `is_active` (boolean), `created_at`
- This maps platform events/conditions to specific Discord roles
- Example rows: "Verified Player" on link, "Tournament Champion" on achievement, "Expert" on quest rank

**2. Admin UI: Discord Role Manager** (new section on Admin Settings or Ecosystem page)
- Fetches available roles from the FGN Discord server via the bot
- Lets admins create mappings: "When [event] happens, assign [Discord role]"
- Shows current mappings in a table with enable/disable toggles

**3. Edge function: `discord-server-roles`**
- New function that uses `DISCORD_BOT_TOKEN` to call `GET /guilds/{id}/roles` and return available roles
- Used by the admin UI to populate role dropdowns

**4. Update `discord-oauth-callback`**
- Instead of assigning one hardcoded role, query `discord_role_mappings` for all `on_link` mappings and assign each matched role
- Keep the current single-role behavior as fallback if no mappings exist

**5. Event-driven role assignment** (future extension)
- Triggers on achievement earned, quest rank change, tournament placement, etc. would query the mappings table and call the Discord API to assign roles

### Files to create/modify
- **New migration**: `discord_role_mappings` table with RLS
- **New edge function**: `supabase/functions/discord-server-roles/index.ts`
- **Modified**: `supabase/functions/discord-oauth-callback/index.ts` — query mappings table
- **New UI component**: Discord role mapping admin interface
- **Modified**: Admin Settings or Ecosystem page to include the new component

