# Test Plan: Points Wallet Credit on Approval

## Summary of Point-Awarding Flows

| Feature | Approval triggers points? | Inserts completion record? | Sends notification? |
|---------|--------------------------|---------------------------|---------------------|
| **Tournaments** (match score) | Yes — `award-season-points` with `points_participation` | N/A (match-based) | Email via `send-tournament-email` |
| **Challenges** (Admin/Mod) | Yes — `award-season-points` with `points_reward` | Yes — `challenge_completions` | Yes — in-app notification |
| **Quests** (Admin/Mod) | Yes — `award-season-points` with `points_first` | Yes — `quest_completions` | Yes — in-app notification + XP credit |

## Pre-requisites
- An active season exists (global or game-specific)
- Test player account with known `season_scores` balance
- Admin/Moderator account for approvals

## Test 1: Tournament Match Points
1. Create a tournament with `points_participation = 5`, register 2+ players, generate bracket
2. Submit a match score (e.g., Player A wins 3-1 over Player B)
3. **Verify**: Both players' `season_scores.points` and `season_scores.points_available` increase by 5
4. **Verify**: Winner's `wins` incremented

## Test 2: Challenge Approval Points
1. Create a challenge with `points_reward = 25`
2. Player enrolls, uploads evidence, submits for review
3. Admin/Moderator sets enrollment status to "completed"
4. **Verify**: `challenge_completions` row created with `awarded_points = 25`
5. **Verify**: Player's `season_scores.points` and `points_available` increase by 25
6. **Verify**: Player receives in-app notification

## Test 3: Quest Approval Points
1. Create a quest with Quest Points = 15 and XP Reward = 20
2. Player enrolls, uploads evidence, submits for review
3. Admin/Moderator sets enrollment status to "completed"
4. **Verify**: `quest_completions` row created with `awarded_points = 15`
5. **Verify**: Player's `season_scores.points` and `points_available` increase by 15
6. **Verify**: Player receives in-app notification
7. **Verify**: Player's `player_quest_xp.total_xp` increases by 20 and rank updates accordingly

## Test 4: Moderator Match Points (standalone)
1. From Moderator > Matches, select a tournament match and submit a winner
2. **Verify**: `award-season-points` is called with tournament's participation points
