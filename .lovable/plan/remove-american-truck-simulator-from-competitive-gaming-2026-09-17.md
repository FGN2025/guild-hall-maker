# Remove American Truck Simulator from Competitive Gaming

## What changes
- One challenge is affected: **"American Truck Simulator"** (`e20536e2-d535-4848-88d4-4351b4dc8ce9`), currently the only ATS entry in the Competitive Gaming category.
- Update that single row: `challenges.track` from `competitive_gaming` to `standard`.
- Result: it disappears from the Competitive Gaming card and appears under the existing **American Truck Simulator** game category card on the Challenges page, alongside ATS's other challenges.

## What stays untouched
- The other 7 Competitive Gaming challenges (Fortnite, Mario Kart World, Marvel Rivals, Pokémon Legends: Z-A, Rocket League, Super Smash Bros. Ultimate, Valorant).
- The challenge's points, tasks, enrollments, evidence, and completion records — only the category tag changes.
- No UI/code changes: `useChallengeHub` already groups by `track`, so the move is automatic.
- Points Rubric: this one challenge simply moves from the Competitive Gaming matrix to the Challenges matrix, which is the intended behavior.

## Technical details
- Single idempotent SQL update:
  ```sql
  UPDATE public.challenges
  SET track = 'standard'
  WHERE id = 'e20536e2-d535-4848-88d4-4351b4dc8ce9'
    AND track = 'competitive_gaming';
  ```
- Post-check: confirm the Competitive Gaming list drops from 8 to 7 rows and the ATS card on `/challenges` shows the moved challenge.
