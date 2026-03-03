# Test Plan: Ladders

Covers ladder creation, player joining, rating/ranking, and win/loss tracking.

---

## Prerequisites

1. Logged in as **Moderator** or **Admin** for ladder management.
2. At least 3 player accounts.

---

## Phase 1: Ladder Creation

### Test 1.1 — Create a Ladder
1. Navigate to moderator ladders page.
2. Create a ladder with Name, Description, and Game.
3. **Expected**: Ladder appears in the list as active.

### Test 1.2 — RLS Enforcement
1. Regular user tries to create a ladder.
2. **Expected**: Blocked by RLS (only moderators/admins can manage ladders).

---

## Phase 2: Joining a Ladder

### Test 2.1 — Player Joins Ladder
1. As a player, navigate to `/ladders` and join an active ladder.
2. **Expected**: `ladder_entries` row created with default `rating = 1000`, `wins = 0`, `losses = 0`.

### Test 2.2 — Duplicate Join Prevention
1. Try joining the same ladder again.
2. **Expected**: Error or button disabled (unique constraint on `ladder_id + user_id`).

### Test 2.3 — View Ladder Rankings
1. View the ladder with 3+ players.
2. **Expected**: Players sorted by `rating` descending. Rank numbers displayed.

---

## Phase 3: Match Recording

### Test 3.1 — Record a Ladder Match
1. As moderator, record a match result between two ladder players.
2. **Expected**: Winner's `wins` and `rating` increase. Loser's `losses` increase and `rating` decreases.

### Test 3.2 — Rating Changes
1. Verify rating adjustment logic (Elo or fixed).
2. **Expected**: Ratings update correctly after each match.

---

## Phase 4: Inactive Ladders

### Test 4.1 — Deactivate a Ladder
1. Set `is_active = false` on a ladder.
2. **Expected**: Ladder hidden from regular users (RLS: `is_active = true` for SELECT). Existing entries preserved.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Ladder with 0 players** | Shows empty state |
| **Player in multiple ladders** | Each has independent rating/record |
| **Ladder without game** | `game_id` is nullable; ladder still functions |
