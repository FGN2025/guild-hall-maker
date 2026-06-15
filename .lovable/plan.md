# Activate HF2 Roof Build Challenge

Flip the draft HF2 Roof Build challenge live on play.fgn.gg.

## Change

Single data update via the insert tool (no schema change):

```sql
UPDATE public.challenges
SET is_active = true, updated_at = now()
WHERE id = 'd00bdfd0-6702-4e46-9ee8-6202aecf9005'
  AND name = 'HF2 Skills: Roof Build and Working-at-Height Safety';
```

## Verification

```sql
SELECT id, name, is_active, game_id, points_reward
FROM public.challenges
WHERE id = 'd00bdfd0-6702-4e46-9ee8-6202aecf9005';
```

Expected: 1 row, `is_active = true`, name unchanged, game_id `3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd`, points_reward 16. The 4 linked `challenge_tasks` rows are untouched.

## Acceptance

- Challenge `d00bdfd0-6702-4e46-9ee8-6202aecf9005` reads `is_active = true`.
- No other challenge rows modified.
- Card now renders on `/challenges` under the House Flipper game filter.
