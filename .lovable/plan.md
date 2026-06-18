## Weekly Registrations Digest Email

A new app email sent to **darcy@fgn.gg** every **Friday at 4:00 PM Pacific** that lists everyone who signed up for a Tournament, Quest, or Challenge in the previous 7 days.

### What the email contains

Three sections, each grouped by item (tournament/quest/challenge), then listing the players who registered in the last 7 days:

```text
TOURNAMENTS
  • <Tournament name> — <game>
      - <Display name> (@handle) — registered Mon Jun 15, 2:14 PM PT
      - <Display name> (@handle) — registered Tue Jun 16, 9:02 AM PT

QUESTS
  • <Quest name>
      - <Display name> (@handle) — enrolled …

CHALLENGES
  • <Challenge name>
      - <Display name> (@handle) — enrolled …
```

Footer shows the totals (e.g. "12 new tournament registrations · 4 new quest enrollments · 7 new challenge enrollments") and a link to the admin pages. If a section has zero new entries that week, it shows "No new registrations this week" instead of being hidden, so the report is always complete.

The window is the **rolling 7 days** ending at send time, so the Friday email always covers Fri → Fri.

### Schedule

- Cron fires **every Friday at 23:00 UTC**, which is 4:00 PM Pacific during Daylight Time (Mar–Nov) and 3:00 PM Pacific during Standard Time (Nov–Mar).
- Pure UTC cron can't follow DST automatically. Two options — please confirm which you want:
  1. **Lock to 23:00 UTC** (4 PM PT in summer, 3 PM PT in winter). Simplest.
  2. **Stay at 4 PM Pacific year-round** — I'd add a small guard in the trigger function that checks the current Pacific hour and exits early on the wrong week, then run two cron rows (22:00 and 23:00 UTC) so exactly one fires per Friday. More moving parts, but DST-correct.

Default in the plan below is option 1 unless you say otherwise.

### Backstop against duplicates

Idempotency key `weekly-registrations-${YYYY-MM-DD}` (the Friday's date) so a retry on the same day won't double-send.

### Technical details

- **New template**: `supabase/functions/_shared/transactional-email-templates/weekly-registrations-digest.tsx`
  - `to: 'darcy@fgn.gg'` baked in (same pattern as the Discord backlog reminder)
  - Accepts `{ windowStart, windowEnd, tournaments[], quests[], challenges[] }` as `templateData`
  - Subject: `FGN weekly registrations — <N> new sign-ups`
- **Registry**: add `weekly-registrations-digest` to `_shared/transactional-email-templates/registry.ts`
- **New trigger function**: `supabase/functions/send-weekly-registrations-digest/index.ts`
  - Uses service-role client to query the last 7 days from `tournament_registrations`, `quest_enrollments`, `challenge_enrollments`, joined to `tournaments`/`quests`/`challenges` for names and `profiles` for display name/handle
  - Builds the `templateData` payload and invokes `send-transactional-email` with the idempotency key
  - `verify_jwt = false` in `supabase/config.toml`
- **Cron**: add a `pg_cron` job via the insert tool (not migration, per project rules):
  - Schedule `0 23 * * 5` calling `net.http_post` to the new function with the anon key
  - Job name `weekly-registrations-digest`
- No schema changes. No new tables. No UI changes.

### Out of scope

- No in-app digest view (email only).
- No per-tenant filtering — this is the global FGN view, matching the existing Discord backlog reminder pattern.
- No "since you last opened it" tracking — strictly a rolling 7-day window.
