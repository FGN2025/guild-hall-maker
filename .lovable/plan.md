

## Automated Engagement Emails

Three new scheduled edge functions that send lifecycle emails via Resend, respecting user notification preferences. Each runs on a pg_cron schedule.

---

### 1. Weekly Recap Email (`weekly-recap-email`)

**Schedule:** Every Monday at 10:00 AM UTC
**Logic:**
- Query all active users (profiles with activity in the last 30 days OR season_scores > 0)
- For each user, gather stats from the past 7 days:
  - Points earned (season_scores delta or challenge/quest completions)
  - Tournaments played (match_results)
  - Achievements unlocked (player_achievements)
  - Challenges/quests completed
- Skip users with zero activity (nothing to report)
- Check `should_notify(user_id, 'weekly_recap', 'email')` preference
- Send branded HTML email via Resend with personalized stats summary and CTAs ("View Leaderboard", "Browse Challenges")

**Deduplication:** Track last recap sent per user in a new `engagement_email_log` table to avoid double-sends on retry.

### 2. Tournament Promo Email (`tournament-promo-email`)

**Schedule:** Daily at 14:00 UTC
**Logic:**
- Find tournaments with status `open` and `start_date` within the next 3 days
- Get all registered user IDs for those tournaments
- Get all active users NOT in that registration list
- Check `should_notify(user_id, 'tournament_promo', 'email')` preference
- Send email: "Don't miss out! [Tournament Name] starts in X days — register now!"
- Deduplicate: only send once per user per tournament (tracked in `engagement_email_log`)

### 3. Re-engagement Email (`reengagement-email`)

**Schedule:** Weekly, Wednesdays at 12:00 UTC
**Logic:**
- Find users who haven't logged in or had any activity (no challenge enrollments, quest completions, match results, or notifications read) in 14+ days
- Exclude users inactive for 90+ days (likely churned — don't spam)
- Check `should_notify(user_id, 'reengagement', 'email')` preference
- Send personalized email: "We miss you! Here's what's new..." with counts of new tournaments, challenges, and quests created since their last activity
- Deduplicate: max one re-engagement email per user per 14-day window

---

### Database Changes

**New table: `engagement_email_log`**
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `email_type` (text: 'weekly_recap' | 'tournament_promo' | 'reengagement')
- `reference_id` (uuid, nullable — tournament ID for promo emails)
- `sent_at` (timestamptz, default now())
- RLS: service-role only (no client access needed)

**Add 3 new notification preference types** to `NOTIFICATION_TYPES` in `useNotificationPreferences.ts`:
- `weekly_recap` — "Weekly Recap"
- `tournament_promo` — "Tournament Promotions"
- `reengagement` — "Re-engagement Reminders"

Also update `NotificationPreferences.tsx` UI to show these new toggles.

**Add `last_active_at` column to `profiles`** (timestamptz, nullable) — updated by a lightweight trigger on login or key actions, used by the re-engagement query to identify inactive users efficiently.

### pg_cron Jobs (via insert tool, not migration)

Three cron entries calling the respective edge functions on schedule.

### Config Changes

Add all three functions to `supabase/config.toml` with `verify_jwt = false`.

### Guide Updates

Update Admin Guide and White Paper with the new automated engagement email system.

---

### Files to Create/Modify

| Action | File |
|--------|------|
| Create | `supabase/functions/weekly-recap-email/index.ts` |
| Create | `supabase/functions/tournament-promo-email/index.ts` |
| Create | `supabase/functions/reengagement-email/index.ts` |
| Migration | Create `engagement_email_log` table; add `last_active_at` to profiles |
| Edit | `src/hooks/useNotificationPreferences.ts` (add 3 types) |
| Edit | `src/components/NotificationPreferences.tsx` (render new toggles) |
| Edit | `supabase/config.toml` (add 3 functions) |
| Edit | `src/pages/admin/AdminGuide.tsx` |
| Edit | `src/pages/WhitePaper.tsx` |
| Cron SQL | 3 pg_cron schedules (via insert tool) |

