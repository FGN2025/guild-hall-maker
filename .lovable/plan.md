# Auto-assign a Discord role on registration

## Assessment — what the current integration can do

Yes, this is achievable with what already exists, with one important caveat about *when* the role can be given.

**What exists today:**
- Players can connect their Discord account to their FGN profile (optional, never forced). Only 35 of 1,268 profiles are currently connected.
- When someone connects, the app already looks up active Discord role mappings marked "on connect" and has the bot assign every matching role to that user in the FGN Discord server. Staff (admins, moderators, provider admins) can be matched to staff-specific roles; everyone else can match an "all players" role.
- Admins already have a screen (Discord Role Manager) to create these mappings.

**What is missing:**
- There are currently **no role mappings configured at all** (the list is empty), so today nobody receives any role automatically — even on connect.
- "Upon registration" literally is not possible: we can't give a Discord role to someone we can't identify on Discord. The closest honest behaviour is: **the role is granted the moment the player connects Discord**, plus a prompt at sign-up inviting them to connect.
- If a player connects Discord but hasn't joined the FGN server yet, the bot can't give them a role (Discord requires server membership first). Auto-joining them is possible but requires a broader Discord permission (`guilds.join`) — optional extra, not needed for the basic version.

**Proposed build (small):**

1. **Configure the default role** — create one "on connect, everyone" role mapping pointing at your Discord "Member/Player" role (you tell me the role name in the FGN server; I look the ID up via the bot). Optionally add staff mappings (admin/moderator → Staff role).
2. **Sign-up prompt** — after registration, if Discord isn't connected, show a one-time prompt ("Connect Discord to get your community role") that links to the existing connect flow. Skippable, respects the "Discord linking is optional" rule.
3. **Optional: auto-join the server** — add the `guilds.join` permission to the connect flow so the bot adds the player to the FGN server before assigning the role. Only if you want it; otherwise players must join the server first.

## Technical details

- Mapping row: `discord_role_mappings` with `trigger_condition = 'on_link'`, `platform_role = NULL` (all users), `is_active = true`. Role ID fetched from the guild via `DISCORD_BOT_TOKEN` (edge function `discord-server-roles`).
- The existing `discord-oauth-callback` function already performs mapping lookup + bot role assignment — no edge-function change needed for steps 1–2.
- Sign-up prompt: a dismissible card after onboarding/profile step, only when `profiles.discord_id IS NULL`. Staff exempt per the existing Discord-optional rule.
- Step 3, if chosen: change OAuth `scope` from `identify` to `identify guilds.join` (LinkDiscord.tsx / ProfileSettings.tsx) and call `PUT /guilds/{guild}/members/{user}` with the user's access token before role assignment.

## Open questions for you

1. Which role should everyone get — the name of the role in your FGN Discord server (e.g. "Member")?
2. Should staff get extra roles automatically too, or only players?
3. Do you want the auto-join-to-server addition, or is "role granted when they connect and are in the server" enough?
