# Automatic Discord role on tournament registration

## What we found
- 132 tournaments have a Discord role set, including all 30 open or upcoming ones. 81 recent sign-ups came from players with a linked Discord account. So the settings and the players are both in place.
- The role is added only by the player's browser, right after they sign up. It runs in the background and hides any error from the player.
- There are no records of the role step running recently, and the role activity log has 0 entries. Either the step isn't running, or it fails without leaving a record.
- Only the sign-up button on the tournament list triggers it. Players added by staff, sign-ups made another way, and players who link Discord after signing up never get the role.
- If Discord rejects the request (player not in the FGN server, bot's role ranked too low, or the role was deleted), the reason is dropped.

The exact Discord error has not been confirmed yet, so the first step is to check it.

## Plan
1. **Diagnose (no changes).** Run the role step once for one real open tournament and a linked player. Record Discord's response: whether the player is missing from the server, the bot lacks permission, or the role is missing.
2. **Run it from the server on every sign-up.** When a new sign-up is saved, the system adds the role automatically, whichever way the player signed up. Remove the browser-only call.
3. **Catch up when Discord is linked later.** When a player links Discord, give them the roles for the open or upcoming tournaments they already signed up for.
4. **Log every attempt** in the existing Discord role log: success, skipped (with the reason) or failed (with Discord's message). Admins can then see and retry failures in the existing admin screen.
5. **Tell players who aren't in the server.** If a player's Discord account isn't in the FGN Discord server, they get an in-app notification (and a pop-up if they're still on the page): "You're not in the FGN Discord server yet. Please join so we can give you your tournament role." The message includes a Join button. After they join, they can use "Retry role" on the tournament page. You set the invite link once in admin settings.
6. **One-time backfill** for linked players already signed up for the 30 open or upcoming tournaments. Players who aren't in the server get the same message.
7. **Optional:** remove the role when a player cancels their sign-up.

## Limits
- Discord can only give a role to someone who is already in the FGN Discord server. Players who aren't members are logged as "not in server" and asked to join (step 5). Adding them to the server automatically would need an extra Discord permission; this is out of scope unless you ask for it.
- The bot's own role must rank above the tournament roles in Discord's server settings.

## Technical details
- Add an AFTER INSERT trigger on `tournament_registrations` that uses pg_net to call `assign-tournament-role` with an internal shared secret, following the pattern of `dispatch_discord_message`. Keep user-JWT auth for manual or admin calls.
- The function writes to `discord_role_action_log` and returns Discord's status and body. Treat 404 Unknown Member as `skipped: not_in_guild`, and 403 or 50013 as `failed: permissions`.
- In `discord-oauth-callback`, after a successful link, loop over the user's registrations for upcoming or open tournaments that have a `discord_role_id`.
- When the result is `not_in_guild`, insert a `notifications` row for the player that links to the `discord_invite_url` app setting. The client also checks the latest log row after registering to show a toast, and a "Retry role" button on TournamentDetail calls the function with the user's JWT. Send at most one notification per player per tournament.
- Remove the `supabase.functions.invoke` call from `useTournaments.ts` registerMutation.
- The backfill is an admin-triggered run over the eligible rows, logged to the same table and rate-limited to respect Discord's 429 responses.
