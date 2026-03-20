

## Problem Assessment

Two issues with the moderator Points Management flow:

### Issue 1: Points not updating in wallet
The mutation in `ModeratorPoints.tsx` updates `season_scores` directly via client-side Supabase calls. RLS policies exist allowing moderator/admin INSERT and UPDATE. The code itself looks correct — it reads the current `points` and `points_available`, computes new values, and upserts.

**Likely cause**: The query after mutation may be returning stale data, OR the RLS policies may have been superseded. However, the more probable issue is that the `toast.success` fires but the actual database write silently fails due to RLS or a constraint. The mutation does `throw error` on failure, so if no error toast appears, the write should succeed. Need to verify by testing.

However, looking more carefully at the code: the mutation updates `season_scores` correctly and records in `point_adjustments`. The screenshot shows the audit trail IS working (Recent Adjustments shows entries). This means the `point_adjustments` insert succeeds. If `season_scores` update were failing, the mutation would throw before reaching the audit insert. So points ARE being written — the issue may be a display/query refresh problem, or the points shown as "0" for most users is simply because they haven't earned any yet.

**Re-examining**: The screenshot shows RacerX has 340/330 and TestPlayer has 95/95 — these look correct. The "Progress Review TEst +10" adjustment for RacerX at 3/20/2026 matches. So points allocation may actually be working. The user may be referring to the fact that players don't see/know about the adjustment.

### Issue 2: No notification sent on manual point adjustment
There is **no trigger or code** that sends a notification to the player when a moderator manually awards or deducts points. The `point_adjustments` table has no associated trigger, and the mutation code doesn't insert into `notifications`.

## Plan

### Step 1: Add in-app notification on point adjustment
After the audit trail insert in `ModeratorPoints.tsx`, insert a notification into the `notifications` table informing the player of the points change, including the reason and amount.

**File: `src/pages/moderator/ModeratorPoints.tsx`**
- After the `point_adjustments` insert, add a `notifications` insert:
  - type: "success" for awards, "warning" for deductions
  - title: "Points Awarded" or "Points Deducted"
  - message: includes amount and reason
  - link: "/leaderboard"

### Step 2: Add email notification for point adjustments
Add a call to the `send-notification-email` edge function (respecting `should_notify` preferences) so players also get an email. This will be done via a database trigger on `point_adjustments` to keep it consistent with the existing notification pattern.

**New migration**: Create a trigger function `notify_point_adjustment()` on the `point_adjustments` table that:
- Fires on INSERT
- Checks `should_notify(user_id, 'points_adjusted', 'in_app')` for in-app notification
- Checks `should_notify(user_id, 'points_adjusted', 'email')` for email notification
- Inserts into `notifications` table for in-app
- Calls `send-notification-email` for email

**Rationale for trigger approach**: Moving the notification to a trigger ensures it fires regardless of whether points are adjusted from the moderator UI, admin UI, or any future interface. This replaces the client-side notification from Step 1.

### Step 3: Add default notification preference
Insert a default row for the new `points_adjusted` notification type so it's enabled by default for both channels.

**File: `src/components/NotificationPreferences.tsx`**
- Add "points_adjusted" to the notification types list so users can toggle it.

## Files to edit
- **New migration SQL**: Create trigger `notify_point_adjustment` and email trigger on `point_adjustments`
- `src/components/NotificationPreferences.tsx`: Add the new notification type to preferences UI

