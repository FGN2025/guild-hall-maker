# Discord Integration Backlog

Source of truth for the daily reminder emailed to darcy@fgn.gg.
When you ask the agent to change the list, edit this file AND the matching
array in `supabase/functions/_shared/transactional-email-templates/discord-backlog-reminder.tsx`.

## Open items

1. **Create #fgn-play-feed channel** in the Fiber Gaming Network server (text, public or staff-only).
2. **Grant FGN Play bot permissions** on the new channel — View Channel, Send Messages, Embed Links.
3. **Copy the new channel ID** (Developer Mode → right-click → Copy Channel ID).
4. **Add the bot route** in Admin → Ecosystem → Discord → Bot Channel Routes for `tournament_published`, tenant blank.
5. **Test send** from the admin panel (📨 icon) and confirm the embed lands in #fgn-play-feed.
6. **Add the remaining purposes** to the same channel ID once the test passes: `tournament_completed`, `tenant_event_published`, `challenge_published`, `quest_published`, `prize_redeemed`, `achievement_earned`.
7. **Register slash commands** (Admin → Discord Webhooks → "Register slash commands") so `/leaderboard`, `/tournaments`, `/challenges` work in the FGN server.
8. **(Optional) Per-tenant routes** — repeat for partner tenants that want their own private feed.
