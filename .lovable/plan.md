

## Points Wallet: Available vs Total Earned

### Problem
Currently the system tracks only a single `points` value in `season_scores`. There is no distinction between total points earned and points available to spend. When a prize is redeemed, the points are not actually deducted from the player's balance -- the redemption is recorded but the balance stays the same.

### Solution
Add a proper points wallet with two tracked values:
- **Total Points Earned** -- lifetime accumulation, never decreases (used for leaderboard ranking)
- **Available Points** -- spendable balance that decreases when prizes are redeemed (used in the Prize Shop)

### Database Changes

**1. Add `points_available` column to `season_scores`**
- New column: `points_available` (integer, default 0)
- The existing `points` column becomes "total points earned" (rename conceptually, no column rename needed)
- Whenever points are awarded (match wins, challenges, manual adjustments), both `points` and `points_available` increase by the same amount
- When a redemption is approved, only `points_available` decreases

**2. Auto-deduct on redemption approval (database trigger)**
- Create a trigger on `prize_redemptions` that fires when `status` changes to `'approved'`
- The trigger deducts `points_spent` from the player's `points_available` in `season_scores`
- Validates that the player has sufficient available points before allowing approval

### Frontend Changes

**3. Prize Shop (`src/pages/PrizeShop.tsx`)**
- Query `points_available` instead of `points` for the "Your Points" wallet display
- Use `points_available` for the "can afford" check
- Show both values: "Available: X pts" prominently, "Total Earned: Y pts" as secondary info

**4. Award Season Points Edge Function (`supabase/functions/award-season-points/index.ts`)**
- When awarding points, increment both `points` (total earned) and `points_available` (spendable balance)

**5. Moderator Points Management (`src/pages/moderator/ModeratorPoints.tsx`)**
- Display both columns in the player table: "Total Earned" and "Available"
- When manually adjusting points, update both values (or allow moderators to choose which to adjust)

**6. Tournament Management Hook (`src/hooks/useTournamentManagement.ts`)**
- Update the score mutation to increment both `points` and `points_available`

**7. Leaderboard and Player Profile**
- Leaderboard continues to sort by `points` (total earned)
- Player profile shows both values

### Combined with Previous Plan Changes

These wallet changes will be implemented alongside the previously approved changes:
- Moderator notification trigger for tournament completion validation
- All prize values displayed as numeric (pts), not currency
- Configurable prize distribution percentages (`prize_pct_first`, `prize_pct_second`, `prize_pct_third`)

### Technical Details

**Migration SQL (single migration for all changes)**:
```text
-- Add points_available to season_scores
ALTER TABLE public.season_scores
  ADD COLUMN points_available integer NOT NULL DEFAULT 0;

-- Add prize distribution percentage columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN prize_pct_first integer NOT NULL DEFAULT 50,
  ADD COLUMN prize_pct_second integer NOT NULL DEFAULT 30,
  ADD COLUMN prize_pct_third integer NOT NULL DEFAULT 20;

-- Backfill: set points_available = points - already_spent
UPDATE public.season_scores ss
SET points_available = GREATEST(0, ss.points - COALESCE(
  (SELECT SUM(pr.points_spent) FROM public.prize_redemptions pr
   WHERE pr.user_id = ss.user_id AND pr.status IN ('approved','fulfilled')),
  0));

-- Trigger: auto-deduct points_available on redemption approval
CREATE OR REPLACE FUNCTION public.deduct_points_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.season_scores
    SET points_available = points_available - NEW.points_spent
    WHERE user_id = NEW.user_id
      AND season_id = (SELECT id FROM public.seasons WHERE status = 'active' LIMIT 1)
      AND points_available >= NEW.points_spent;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient available points';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_points_on_approval
  BEFORE UPDATE ON public.prize_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.deduct_points_on_approval();

-- Trigger: notify moderators when tournament final match completes
CREATE OR REPLACE FUNCTION public.notify_moderators_tournament_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  _max_round integer;
  _tname text;
  _uid uuid;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT MAX(round) INTO _max_round
    FROM public.match_results WHERE tournament_id = NEW.tournament_id;
    IF NEW.round = _max_round THEN
      SELECT name INTO _tname FROM public.tournaments WHERE id = NEW.tournament_id;
      FOR _uid IN
        SELECT ur.user_id FROM public.user_roles ur
        WHERE ur.role IN ('moderator', 'admin')
      LOOP
        INSERT INTO public.notifications (user_id, type, title, message, link)
        VALUES (_uid, 'info',
          'Tournament Placements Need Validation',
          '"' || _tname || '" final match is complete. Please validate 1st, 2nd, and 3rd place results.',
          '/moderator/tournaments');
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_mods_tournament_complete
  AFTER UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.notify_moderators_tournament_complete();
```

### Files Modified
- New database migration (all schema changes above)
- `supabase/functions/award-season-points/index.ts` -- increment both `points` and `points_available`
- `src/pages/PrizeShop.tsx` -- show wallet with available/total, use `points_available` for affordability
- `src/pages/moderator/ModeratorPoints.tsx` -- show both columns, adjust both on manual changes
- `src/hooks/useTournamentManagement.ts` -- increment both fields
- `src/components/tournaments/PrizePoolSelector.tsx` -- numeric display, add percentage inputs
- `src/components/tournaments/PrizeDisplay.tsx` -- numeric display, use percentages
- `src/components/tournaments/CreateTournamentDialog.tsx` -- add percentage fields
- `src/components/tournaments/EditTournamentDialog.tsx` -- add percentage fields
- `src/hooks/useTournaments.ts` -- include percentage fields

