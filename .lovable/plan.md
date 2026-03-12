

## Test Plan: Points Wallet Credit on Approval

### Summary of Current Point-Awarding Flows

| Feature | Approval triggers points? | Inserts completion record? | Sends notification? |
|---------|--------------------------|---------------------------|---------------------|
| **Tournaments** (match score) | Yes — `award-season-points` called with `points_participation` for both winner and loser | N/A (match-based) | Email via `send-tournament-email` |
| **Challenges** (Admin) | Yes — `award-season-points` called with `points_reward` | Yes — `challenge_completions` | Yes — `notifications` insert |
| **Challenges** (Moderator) | Yes — identical logic | Yes | Yes |
| **Quests** (Admin/Moderator) | **NO — BUG** | **NO** | **NO** |

### Critical Bug Found

**`src/components/quests/AdminQuestsPanel.tsx` line 127-133**: When a quest enrollment status is changed to "completed", the mutation **only** updates the enrollment status. It does **not**:
1. Insert a `quest_completions` record
2. Call `award-season-points` to credit the player's wallet
3. Insert a notification to inform the player

This means quest approvals currently award zero points and leave no audit trail. The challenge approval flow (in both `AdminChallenges.tsx` and `ModeratorChallenges.tsx`) correctly handles all three steps — the quest flow needs the same treatment.

---

### Manual Test Plan

#### Pre-requisites
- An active season exists (global or game-specific)
- Test player account with known `season_scores` balance
- Admin/Moderator account for approvals

#### Test 1: Tournament Match Points
1. Create a tournament, register 2+ players, generate bracket
2. Submit a match score (e.g., Player A wins 3-1 over Player B)
3. **Verify**: Both players' `season_scores.points` and `season_scores.points_available` increase by `points_participation` value
4. **Verify**: Winner's `wins` incremented; loser's record unchanged (participation points go to both)

#### Test 2: Challenge Approval Points
1. Create a challenge with `points_reward = 25`
2. Player enrolls, uploads evidence, submits for review
3. Admin/Moderator sets enrollment status to "completed"
4. **Verify**: `challenge_completions` row created with `awarded_points = 25`
5. **Verify**: Player's `season_scores.points` and `points_available` increase by 25
6. **Verify**: Player receives in-app notification

#### Test 3: Quest Approval Points (WILL FAIL — bug)
1. Create a quest with `points_reward = 15`
2. Player enrolls, uploads evidence, submits for review
3. Admin/Moderator sets enrollment status to "completed"
4. **Verify**: `quest_completions` row should be created — **currently missing**
5. **Verify**: Player's `season_scores` should increase by 15 — **currently not happening**
6. **Verify**: Player should receive notification — **currently not sent**

#### Test 4: Moderator Match Points (standalone)
1. From Moderator > Matches, select a tournament match and submit a winner
2. **Verify**: `award-season-points` is called (default 10 winner / 2 loser points used here — note this path uses defaults, not tournament-configured participation points)

---

### Recommended Fix

Add the same completion/points/notification logic from `AdminChallenges.tsx` (lines 140-181) into `AdminQuestsPanel.tsx`'s `updateStatusMutation`, keyed on `status === "completed"`:
1. Fetch the quest's `points_reward` and game name
2. Insert into `quest_completions`
3. Insert notification
4. Call `award-season-points` with `points_reward`

This is a single-file change to `src/components/quests/AdminQuestsPanel.tsx`.

