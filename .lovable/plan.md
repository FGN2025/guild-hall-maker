
# Configurable Discord Role Assignment — Completed

## What was built

### Database
- **`discord_role_mappings`** table with columns: `id`, `discord_role_id`, `discord_role_name`, `trigger_condition` (enum: on_link, on_achievement, on_rank, on_tournament_win, manual), `condition_value`, `is_active`, `created_at`
- Admin-only RLS policies

### Edge Functions
- **`discord-server-roles`**: Fetches available roles from the FGN Discord server via bot API. Admin-authenticated.
- **`discord-oauth-callback`** (updated): Queries `discord_role_mappings` for all active `on_link` mappings and assigns each role. Falls back to `DISCORD_VERIFIED_ROLE_ID` if no mappings exist.

### Admin UI
- **`DiscordRoleManager`** component added to the Ecosystem admin page
- Fetch server roles button, role + trigger selector, add/toggle/delete mappings
