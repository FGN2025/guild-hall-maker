# Test Plan: Challenges

Covers challenge creation, completion tracking, point awards, and notifications.

---

## Prerequisites

1. Logged in as **Moderator** or **Admin** for creation.
2. An active season exists.
3. A regular player account for completion tests.

---

## Phase 1: Challenge Creation

### Test 1.1 — Create a Challenge
1. Navigate to moderator challenges page.
2. Create a challenge with: Name, Description, Game, Points (1st/2nd/3rd/participation), Type (one_time), Max Completions.
3. **Expected**: Challenge appears in the list as active. Notification sent to all players ("New Challenge Available").

### Test 1.2 — Email + In-App Notifications
1. Verify `notify_new_challenge` trigger fires on INSERT with `is_active = true`.
2. **Expected**: All players with `should_notify(uid, 'new_challenge', 'in_app') = true` receive an in-app notification. Email trigger `email_new_challenge` also fires.

### Test 1.3 — Inactive Challenge
1. Create a challenge with `is_active = false`.
2. **Expected**: No notifications sent. Challenge not visible to regular users (RLS: `is_active = true` for SELECT).

---

## Phase 2: Challenge Completion

### Test 2.1 — Moderator Records Completion
1. As moderator, record a completion for a player on an active challenge.
2. **Expected**: Row inserted into `challenge_completions` with `awarded_points` and `verified_by`.

### Test 2.2 — Points Awarded to Season
1. Check the player's `season_scores` after completion.
2. **Expected**: Points increased by the awarded amount (via the edge function or trigger logic).

### Test 2.3 — Max Completions Enforced
1. Set `max_completions = 3` on a challenge. Record 3 completions.
2. **Expected**: 4th completion attempt is blocked or shows the challenge as "full."

### Test 2.4 — Player Views Own Completions
1. As the player, navigate to challenges page.
2. **Expected**: Completed challenges show a "Completed" badge. Points earned are displayed.

---

## Phase 3: Challenge Types & Dates

### Test 3.1 — Time-Limited Challenge
1. Create a challenge with `start_date` in the past and `end_date` in the future.
2. **Expected**: Challenge is visible and completable.

### Test 3.2 — Expired Challenge
1. Set `end_date` to the past.
2. **Expected**: Challenge shows as expired/inactive. No new completions accepted.

---

## Phase 4: Tiered Point Awards

### Test 4.1 — First Three Completions Get Bonus
1. Have 4 players complete the same challenge.
2. **Expected**: 1st gets `points_first` (10), 2nd gets `points_second` (5), 3rd gets `points_third` (3), 4th+ gets `points_participation` (2).

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Delete a completion** | Moderator can delete; points may need manual adjustment |
| **Challenge with no game** | `game_id` is nullable; challenge still functions |
| **Notification preferences disabled** | `should_notify` returns false; no notification created |
| **No active season** | Completion recorded but points not added to season_scores |
