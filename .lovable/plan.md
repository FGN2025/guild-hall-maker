# Move the Discord link to darcy@fgn.gg

## What the new error revealed

The improved conflict message worked exactly as intended. The Discord account `fgnadmin` (Discord ID `1339294679501639826`) is held by a second, dormant account:

- Holder: `darcylorincz@gmail.com` — display name is just the email, no roles assigned, last sign-in 20 Mar 2026.
- Target: `darcy@fgn.gg` (RacerX, platform admin) — Discord fields are empty, last sign-in 25 Aug 2026.

So this is one person with two accounts, and the Discord identity sits on the stale one.

## The fix

A one-off data correction, no code change:

1. Clear `discord_id`, `discord_username`, and `discord_avatar` on the `darcylorincz@gmail.com` profile.
2. Set the same Discord ID, username, and avatar on the `darcy@fgn.gg` (RacerX) profile.

Both steps run in a single statement so the unique Discord identity is never held twice.

## After the change

- Darcy's `darcy@fgn.gg` account shows Discord linked as `fgnadmin` in Profile Settings, with no re-authorization needed.
- The gmail account becomes unlinked and can link a different Discord later, or be retired separately.
- Verification: re-read both profiles and confirm exactly one row holds the Discord ID.

## Technical notes

- Data-only update to `public.profiles`; no schema, RLS, or edge-function changes.
- Discord role syncing keys off `discord_id` on the profile, so roles will resolve against the admin account on the next sync.
- The gmail account itself is left in place — deleting it was not requested.
