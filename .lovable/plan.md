

## Enhance Ecosystem Data API for FGN Academy Challenge Import

### Problem

The screenshot shows fgn.academy's "Import Challenge from FGN" dialog failing with "Failed to load challenges from play.fgn.gg". The `ecosystem-data-api` edge function already supports a `challenges` action, but two issues need fixing on play.fgn.gg's side:

1. **Missing game name**: The response only includes `game_id` (a UUID), not the human-readable game name. The academy needs game names for its "All Games" filter dropdown and display.
2. **Missing tasks and estimated time**: The response omits `estimated_minutes` and associated `challenge_tasks`, which the academy needs to populate work order fields (XP Reward, Est. Time, Success Criteria visible in the screenshot).

### Plan

**File: `supabase/functions/ecosystem-data-api/index.ts`** — Enhance the `challenges` case:

1. **Join game name**: Change the select to include `games(name)` via the `game_id` foreign key, so each challenge includes the game name.
2. **Add missing fields**: Include `estimated_minutes` in the select.
3. **Fetch tasks**: After loading challenges, batch-fetch `challenge_tasks` for the returned challenge IDs and attach them to each challenge in the response.
4. **Flatten response**: Map `games.name` to a top-level `game_name` field for easy consumption.

Updated select:
```sql
id, name, description, game_id, challenge_type, difficulty, points_reward,
estimated_minutes, start_date, end_date, requires_evidence, cover_image_url,
created_at, updated_at, games(name)
```

After fetching challenges, add:
```typescript
const challengeIds = (data || []).map(c => c.id);
const { data: tasks } = await adminClient
  .from("challenge_tasks")
  .select("challenge_id, title, description, display_order")
  .in("challenge_id", challengeIds)
  .order("display_order");

result = (data || []).map(c => ({
  ...c,
  game_name: c.games?.name || null,
  games: undefined,
  tasks: (tasks || []).filter(t => t.challenge_id === c.id),
}));
```

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/ecosystem-data-api/index.ts` | Enhance `challenges` action: join game name, add `estimated_minutes`, attach tasks |

### What This Enables

The fgn.academy "Import Challenge from FGN" dialog will receive:
- Challenge name, description, difficulty, type
- Game name (for the filter dropdown)
- Estimated minutes, points reward (for XP Reward / Est. Time fields)
- Task list (for success criteria / objectives)
- Cover image URL

No new secrets or database changes needed — the existing `ECOSYSTEM_API_KEY` auth and `challenge_tasks` table are already in place.

