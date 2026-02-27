

## Fix: RLS Policy Conflict on `season_scores`

### Problem
When a moderator tries to award points via the Points Management page, the insert/update fails with:
> "new row violates row-level security policy for table 'season_scores'"

### Root Cause
The `season_scores` table has two sets of conflicting RLS policies:
- "Moderators can insert season scores" (allows moderator inserts)
- "Moderators can update season scores" (allows moderator updates)
- "Only service role manages scores" -- `WITH CHECK (false)` (blocks ALL inserts)
- "Only service role updates scores" -- `USING (false)` (blocks ALL updates)

The `false` policies were likely added when only the Edge Function (using the service role key) was supposed to manage scores. Now that moderators also need client-side access, these policies conflict and block all browser-based writes.

### Fix
Run a single database migration to drop the two blocking policies:

```sql
DROP POLICY "Only service role manages scores" ON public.season_scores;
DROP POLICY "Only service role updates scores" ON public.season_scores;
```

Additionally, the moderator UPDATE policy should also include admins for consistency (it currently only checks for `moderator`). We'll update both the INSERT and UPDATE policies to allow admins as well:

```sql
DROP POLICY "Moderators can insert season scores" ON public.season_scores;
CREATE POLICY "Moderators can insert season scores"
  ON public.season_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY "Moderators can update season scores" ON public.season_scores;
CREATE POLICY "Moderators can update season scores"
  ON public.season_scores FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
```

### No Code Changes Needed
The `ModeratorPoints.tsx` component logic is correct -- it properly inserts/updates `season_scores` and records an audit trail in `point_adjustments`. Only the database policies need to be fixed.

### Summary of Changes
1. Drop "Only service role manages scores" policy (INSERT blocker)
2. Drop "Only service role updates scores" policy (UPDATE blocker)
3. Recreate moderator INSERT and UPDATE policies to also include admin role

