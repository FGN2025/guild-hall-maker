

## Fix Mutable Search Path on `compute_quest_rank`

### Problem
The `compute_quest_rank(xp integer)` function is missing an explicit `SET search_path` directive, which the security scanner flags as a "warn" level issue.

### Fix — Single Migration

Recreate the function with `SET search_path TO 'public'` added:

```sql
CREATE OR REPLACE FUNCTION public.compute_quest_rank(xp integer)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN xp >= 1000 THEN 'master'
    WHEN xp >= 600  THEN 'expert'
    WHEN xp >= 300  THEN 'journeyman'
    WHEN xp >= 100  THEN 'apprentice'
    ELSE 'novice'
  END;
$$;
```

No code file changes needed — this is a database-only fix.

### Files Changed

| File | Change |
|------|--------|
| New migration | `ALTER` `compute_quest_rank` to include `SET search_path TO 'public'` |

