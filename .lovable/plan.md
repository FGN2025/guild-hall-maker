## Goal

Give you a working sign-in that has full platform admin access, so nothing on the site is locked behind signup.

## Important finding

`nicholasbalog19@gmail.com` **already exists** in the system:

- Email confirmed: yes
- Role: `admin` (platform admin — highest level)
- Last sign-in: 2026-03-04

So no new account is needed. Creating a second one under the same email isn't possible anyway. The right move is to set a fresh password on this existing account.

## What I'll do

1. Set a new password on `nicholasbalog19@gmail.com` via the admin auth API (server-side, no email round-trip needed).
2. Ensure the account stays email-confirmed so it bypasses the `/confirm-email` gate.
3. Verify the `admin` row in `user_roles` is intact.
4. Report the credentials back to you in chat.

Password: I'll generate a strong temporary one and give it to you, unless you'd rather pick your own — tell me a password and I'll use that instead.

## What this unlocks

With the `admin` role you get:

- `/admin/*` — full platform admin (users, tenants, games, tournaments, challenges, quests, media, settings, agent prompts, universal assets)
- `/moderator/*` — moderator panel (admins pass that gate too)
- `/tenant/*` — tenant portal in platform-admin tenant-switching mode, so you can view any tenant
- All normal player-facing pages

## Notes

- Discord linking is optional and ZIP gates are skipped for staff, so there's no onboarding wall after login.
- Change the password from Profile Settings after you're in.
