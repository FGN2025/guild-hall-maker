

## Scheduled Social Media Publishing — Level of Effort Assessment

**Effort: Medium-Low** (builds on top of the social publishing feature from the previous plan)

This is an incremental addition to the social media publishing pipeline. The core publishing logic (connecting accounts, calling platform APIs) is the heavy lift — scheduling is a relatively thin layer on top.

### What's Needed

**1. Database: `scheduled_posts` table**
Stores queued posts with a future publish date:
- `id`, `tenant_id`, `user_id` (creator)
- `connection_id` → which social account to publish to
- `platform` (facebook, instagram, twitter, linkedin)
- `image_url` (the asset to publish)
- `caption` (post text)
- `scheduled_at` (timestamptz — when to publish)
- `status` (pending, published, failed)
- `published_at`, `error_message`
- `created_at`

**2. Scheduled publishing edge function**
A `publish-scheduled-posts` function that:
- Queries `scheduled_posts` where `scheduled_at <= now()` and `status = 'pending'`
- For each, calls the existing `publish-to-social` function
- Updates status to `published` or `failed`
- Triggered by a `pg_cron` job running every 5 minutes

**3. UI: Schedule option in Asset Editor**
Extend the "Publish" dropdown with a "Schedule for later" option that opens a date/time picker dialog. On confirm, inserts into `scheduled_posts` instead of publishing immediately.

**4. UI: Scheduled Posts calendar/list view**
A new sub-tab or section in the Marketing Console showing upcoming scheduled posts in a calendar or timeline view, with the ability to:
- View queued posts by date
- Cancel or reschedule a pending post
- See status (pending / published / failed)

### Files to Create/Modify
- **New migration**: `scheduled_posts` table + RLS
- **New**: `supabase/functions/publish-scheduled-posts/index.ts`
- **New**: `src/components/marketing/ScheduledPostsCalendar.tsx`
- **New**: `src/hooks/useScheduledPosts.ts`
- **Edit**: Asset Editor — add "Schedule" option with date/time picker
- **Edit**: Marketing Console tabs — add "Scheduled" tab
- **pg_cron job**: Run `publish-scheduled-posts` every 5 minutes

### Dependencies
This feature depends on the social media connection + publishing infrastructure from the previous plan. Both can be built together or sequentially.

### Summary
The scheduling layer itself is straightforward — a table, a cron job, and a calendar UI. The heavier prerequisite is the social account connections and publishing API integrations, which are part of the prior approved plan.

