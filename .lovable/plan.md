

# Test Plan: Full Tournament Lifecycle

This plan covers end-to-end testing of the tournament system from creation through completion, including registration, bracket generation, match scoring, point awards, winner advancement, and notifications.

---

## Prerequisites

Before running tests, ensure:

1. You are logged in as a **Moderator** or **Admin** (tournament creator).
2. At least **one active season** exists in the `seasons` table (status = `active`).
3. At least **2 additional test user accounts** exist with profiles (to register as players). If not available, you can register the current user and seed additional registrations via the backend.
4. A **prize** exists in the Prize Shop (for testing the Physical Prize pool mode).

---

## Phase 1: Tournament Creation

### Test 1.1 -- Create Tournament (Value Prize Pool)
1. Navigate to `/moderator/tournaments`.
2. Click **Create Tournament**.
3. Fill in:
   - Name: "QA Test Tournament"
   - Game: "Apex Legends"
   - Format: Single Elimination
   - Max Players: 4
   - Start Date: tomorrow
   - Prize Type: **Value** with pool "100"
   - Distribution: 50% / 30% / 20%
   - Season Points: 1st=10, 2nd=5, 3rd=3, Participation=2
4. Click **Create Tournament**.
5. **Expected**: Toast "Tournament created!" appears. Tournament shows in the table with status `open`.

### Test 1.2 -- Verify Tournament Detail Page
1. Navigate to `/tournaments/{id}` for the newly created tournament.
2. **Expected**: Name, game, format, start date, player count (0/4), and prize pool breakdown (50 pts / 30 pts / 20 pts) all display correctly.
3. **Expected**: "Manage Tournament" button visible (as creator).

---

## Phase 2: Player Registration

### Test 2.1 -- Register for Tournament
1. As the logged-in user, click **Register Now** on the tournament detail page.
2. **Expected**: Toast "Registered successfully!" Button changes to "Cancel Registration." Player count updates to 1/4.
3. **Expected**: A registration confirmation notification appears in the notification bell.

### Test 2.2 -- Cancel and Re-Register
1. Click **Cancel Registration**.
2. **Expected**: Toast "Registration cancelled." Button reverts to "Register Now."
3. Re-register to remain enrolled.

### Test 2.3 -- Verify Registration Cap
1. Register 4 players total (seed additional registrations via backend if needed).
2. **Expected**: The "Register Now" button changes to "Tournament Full" and is disabled for any 5th user.

### Test 2.4 -- Registration on Non-Open Tournament
1. Change the tournament status to `in_progress` via the manage page.
2. Navigate to the detail page as a non-registered user.
3. **Expected**: Registration button is disabled (only `open` and `upcoming` allow registration).

---

## Phase 3: Bracket Generation

### Test 3.1 -- Generate Bracket (4 Players)
1. Navigate to `/tournaments/{id}/manage`.
2. Verify 4 registered players are listed.
3. Click **Generate Bracket**.
4. **Expected**: Toast "Bracket generated!" Round 1 shows 2 matches (M1, M2) with all 4 players assigned. Round 2 shows 1 match with both slots as "TBD." Tournament status auto-changes to `in_progress`.

### Test 3.2 -- Verify Bracket View
1. Click **View Bracket** (or navigate to `/tournaments/{id}/bracket`).
2. **Expected**: Visual bracket displays Round 1 (2 matches) and Round 2 (Final). Players are shuffled randomly.

### Test 3.3 -- Bracket with Odd Players (3 Players)
1. Create a new tournament with max 4 players, register only 3.
2. Generate bracket.
3. **Expected**: One Round 1 match has a real player vs a null slot (bye). The bye player should auto-advance to Round 2 (verify the next-round match gets a player1 or player2 populated).

### Test 3.4 -- Reset Bracket (No Completed Matches)
1. After generating a bracket but before scoring any match, click **Reset Bracket**.
2. Confirm the dialog.
3. **Expected**: Toast "Bracket reset!" All matches are deleted. Tournament reverts to `open` status. "Generate Bracket" button reappears.

### Test 3.5 -- Reset Blocked After Completed Match
1. Regenerate the bracket, then score one match.
2. **Expected**: The "Reset Bracket" button disappears (it only shows when `hasMatches && !hasCompletedMatches`).

---

## Phase 4: Match Scoring and Winner Advancement

### Test 4.1 -- Score Round 1, Match 1
1. On the manage page, click **Set Score** on Match M1.
2. Enter scores (e.g., Player A: 3, Player B: 1).
3. Click **Save**.
4. **Expected**: Toast "Score updated!" Match M1 shows "Done" badge. Winner name is highlighted in green. The winner is automatically advanced to Round 2 (player1 slot of the Final match).

### Test 4.2 -- Score Round 1, Match 2
1. Score Match M2 (e.g., Player C: 0, Player D: 5).
2. **Expected**: Player D wins, advances to Round 2 (player2 slot of the Final). The Final match now shows both finalists.

### Test 4.3 -- Score the Final
1. Score the Final match (e.g., Winner of M1: 2, Winner of M2: 4).
2. **Expected**: Final match marked "Done." All matches are now completed.

### Test 4.4 -- Tied Score Handling
1. In a separate test tournament, enter tied scores (e.g., 2 vs 2).
2. **Expected**: `winner_id` is set to `null` (no advancement). The system does not crash. The moderator can re-enter corrected scores.

### Test 4.5 -- Real-Time Bracket Updates
1. Open the bracket view (`/tournaments/{id}/bracket`) in a second browser tab.
2. Score a match in the manage tab.
3. **Expected**: The bracket view auto-refreshes via the Realtime subscription without manual reload.

---

## Phase 5: Season Points

### Test 5.1 -- Participation Points per Match
1. After scoring a match, check the `season_scores` table for both the winner and loser.
2. **Expected**: Both players received `points_participation` points (default 2 each) for that match. The `points_available` field increased by the same amount.

### Test 5.2 -- Points Accumulate Across Matches
1. After all matches are scored, verify a player who played 2 matches (Round 1 + Final) has 2 x participation points.
2. **Expected**: Points accumulate correctly across multiple matches in the same tournament.

### Test 5.3 -- No Active Season
1. Temporarily set all seasons to `completed` (no active season).
2. Score a match.
3. **Expected**: The `award-season-points` function returns `{ success: false, message: "No active season" }` gracefully. No crash. Toast still shows "Score updated!" (points are best-effort).

---

## Phase 6: Notifications

### Test 6.1 -- Registration Confirmation Notification
1. Register for a tournament.
2. **Expected**: In-app notification: "Registration Confirmed -- You are registered for [name]. Good luck!" (triggered by `notify_registration_confirmed` trigger).
3. **Expected**: Email notification sent (if user has `registration_confirmed` email enabled).

### Test 6.2 -- Tournament Starting Notification
1. When bracket is generated (status changes to `in_progress`), check notifications for all registered players.
2. **Expected**: In-app notification: "Tournament Starting Now! -- [name] is now live" (triggered by `notify_tournament_starting` trigger).

### Test 6.3 -- Match Completed Notification
1. After scoring a match, check notifications for both players.
2. **Expected**: Winner gets "You won your Round X match in [name]!" (success type). Loser gets "Your Round X match in [name] has concluded." (info type).

### Test 6.4 -- Final Match Moderator Alert
1. After scoring the final match, check notifications for all moderators/admins.
2. **Expected**: "Tournament Placements Need Validation -- [name] final match is complete" notification appears (triggered by `notify_moderators_tournament_complete`).

### Test 6.5 -- Notification Preferences Respected
1. Disable "Match Completed" in-app notifications for a test player via Profile Settings.
2. Score a match involving that player.
3. **Expected**: No in-app notification is created for that player (the `should_notify` function returns false).

---

## Phase 7: Tournament Completion and Status Management

### Test 7.1 -- Status Transitions via Manage Page
1. On the manage page, change status from `in_progress` to `completed` via the dropdown.
2. **Expected**: Toast "Tournament status updated!" Badge updates.

### Test 7.2 -- Status Change via Moderator Panel
1. Navigate to `/moderator/tournaments`.
2. Change a tournament's status via the inline dropdown.
3. **Expected**: Same behavior as manage page. Status updates persist.

### Test 7.3 -- Edit Tournament Details
1. On the manage page, click the Edit button.
2. Change the name and point values.
3. **Expected**: Details update. Bracket and match data remain intact.

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Generate bracket with 2 players** | 1 match (the Final), no subsequent rounds |
| **Generate bracket with 1 player** | Error: "Need at least 2 registered players" |
| **Non-creator visits /manage** | "Access Denied" message with back button |
| **Score a match where a player slot is null (TBD)** | "Set Score" button hidden; shows "Waiting" badge |
| **Duplicate registration** | Error toast: "Already registered" |
| **Register when not authenticated** | Error: "Not authenticated" |

---

## Technical Details

- **Bracket generation**: Uses client-side shuffle + single-elimination seeding in `useTournamentManagement.ts`. Pads to next power of 2 with byes.
- **Winner advancement**: After scoring, the hook calculates `nextMatchIdx = floor((match_number - 1) / 2)` and assigns to player1 (even) or player2 (odd) slot.
- **Points**: Calls the `award-season-points` edge function per match. During regular matches, both winner and loser receive equal participation points.
- **Realtime**: Both bracket view and manage page subscribe to `postgres_changes` on `match_results` filtered by `tournament_id`.
- **Notifications**: DB triggers fire on `tournament_registrations` INSERT, `tournaments` UPDATE (status change), and `match_results` UPDATE (status = completed).

