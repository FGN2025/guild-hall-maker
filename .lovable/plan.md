

## Configurable Points for Tournaments and Challenges

### Overview
Replace the hardcoded 10/2 point system with configurable per-tournament and per-challenge point values for 1st, 2nd, 3rd place, and participation.

### Database Changes
Add four new columns to both `tournaments` and `challenges` tables:
- `points_first` (integer, default 10) -- 1st place points
- `points_second` (integer, default 5) -- 2nd place points
- `points_third` (integer, default 3) -- 3rd place points
- `points_participation` (integer, default 2) -- participation points for all completers

### Frontend Changes

**1. Create Tournament Dialog** (`src/components/tournaments/CreateTournamentDialog.tsx`)
- Add a "Season Points" section with 4 numeric inputs: 1st Place, 2nd Place, 3rd Place, Participation
- Pass these values through the `onCreate` callback

**2. Edit Tournament Dialog** (`src/components/tournaments/EditTournamentDialog.tsx`)
- Same 4 fields, pre-populated from tournament data
- Pass through `onUpdate` callback

**3. Moderator Challenges** (`src/pages/moderator/ModeratorChallenges.tsx`)
- Add the same 4 point fields to the challenge creation form (replacing the single "Points Reward" field)
- Show tiered points in the challenge list table

**4. Tournament Management Hook** (`src/hooks/useTournamentManagement.ts`)
- Update `updateDetailsMutation` to include the 4 point fields
- Update `updateScoreMutation` to pass tournament-specific point values to the `award-season-points` function instead of relying on hardcoded values
- When the final match completes, determine 1st/2nd/3rd place and award accordingly

**5. Award Season Points Edge Function** (`supabase/functions/award-season-points/index.ts`)
- Accept optional `points_winner` and `points_loser` parameters (falling back to 10/2 defaults)
- This allows the frontend to pass the tournament's configured values

### How Placement Works

**Tournaments**: The bracket structure naturally determines placements:
- Winner of the final match = 1st place (gets `points_first`)
- Loser of the final match = 2nd place (gets `points_second`)
- Losers of the semifinal matches = 3rd place (gets `points_third`)
- All other participants = participation (gets `points_participation`)

During regular match scoring, only participation points are awarded per match. The placement bonus points (1st/2nd/3rd) are awarded when the tournament is marked as completed.

**Challenges**: The existing `points_reward` field will be replaced by the tiered system. Since challenges are typically complete/not-complete, the `points_participation` value applies to all completers, while `points_first/second/third` can be used for the first 3 completers (based on completion timestamp).

### Files Modified
- `src/components/tournaments/CreateTournamentDialog.tsx`
- `src/components/tournaments/EditTournamentDialog.tsx`
- `src/pages/moderator/ModeratorChallenges.tsx`
- `src/hooks/useTournamentManagement.ts`
- `supabase/functions/award-season-points/index.ts`
- New database migration for the 4 columns on both tables

