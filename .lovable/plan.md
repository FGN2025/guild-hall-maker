

## Assessment: play.fgn.gg Changes for Seamless User Journey

The academy team identified 3 gaps. Here's what **this team** (play.fgn.gg) needs to do:

### Gap 1: Player-facing progress view — NOT our responsibility
This is an **fgn.academy UI change** (showing task progress on their Work Order Detail page). play.fgn.gg already sends all necessary data (`task_progress`, `score`, completion status) via the sync. **No action needed from this team.**

### Gap 2: Prompt to register on fgn.academy — OUR responsibility
When a challenge is completed and the sync returns a 404 "User not found," there's no feedback to the player. Two changes needed:

1. **Update `sync-to-academy` edge function** — Instead of silently logging the 404, return a structured response indicating the user wasn't found on the academy side.

2. **Show a banner on the ChallengeDetail page** — After a challenge is marked completed, if the academy sync failed with "user not found," display a subtle prompt:
   > *"Track your skills on FGN Academy — sign up at fgn.academy with the same email to earn credentials."*

   This goes in `src/pages/ChallengeDetail.tsx` within the `enrollment?.status === "completed"` block (line 329). We can check `challenge_completions.academy_synced` to determine if the sync succeeded.

3. **Optionally show the same prompt on the Challenges list page** as a one-time dismissible banner for users who have completions but no successful academy sync.

### Gap 3: Notification when progress syncs — SHARED responsibility
The notification itself lives on fgn.academy's side. However, play.fgn.gg can enhance the experience by:

1. **Showing a toast notification** when a challenge completion is approved and the academy sync succeeds — "Your progress has been synced to FGN Academy!"
2. This already partially exists in the admin/moderator approval flow (fire-and-forget call in `AdminChallenges.tsx` line 178 and `ModeratorChallenges.tsx` line 176), but the sync result is never surfaced.

### Implementation Plan

| # | Change | File(s) | Scope |
|---|--------|---------|-------|
| 1 | Return `user_not_found` flag from sync edge function when academy returns 404 | `supabase/functions/sync-to-academy/index.ts` | ~5 lines |
| 2 | Store sync status reason in `challenge_completions` | DB migration — add `academy_sync_note` text column | 1 migration |
| 3 | Show "Join FGN Academy" banner on completed challenges where `academy_synced = false` | `src/pages/ChallengeDetail.tsx` | ~15 lines |
| 4 | Surface sync success toast in admin/moderator approval flows | `src/pages/admin/AdminChallenges.tsx`, `src/pages/moderator/ModeratorChallenges.tsx` | ~10 lines each |

### What to Tell the Academy Team

- **Gap 1** is entirely on their side — the data is already in their database from our sync.
- **Gap 2** — we'll add a player-facing prompt. We need them to confirm the 404 response body format so we can detect "user not found" vs other errors.
- **Gap 3** — we'll add a toast on our side; they should build their notification feed independently.

