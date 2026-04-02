

## Steam Achievement Auto-Tracking System

### Overview
Build a system that syncs a player's Steam achievements and uses them to auto-unlock platform achievements via the existing `auto_criteria` pattern.

### 1. Database Migration — New Table + Extended Criteria

**Create `steam_player_achievements` table:**

```sql
CREATE TABLE public.steam_player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  steam_app_id text NOT NULL,
  achievement_api_name text NOT NULL,
  achieved boolean NOT NULL DEFAULT false,
  unlock_time timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, steam_app_id, achievement_api_name)
);

ALTER TABLE public.steam_player_achievements ENABLE ROW LEVEL SECURITY;

-- Players can read their own synced achievements
CREATE POLICY "Users can view own steam achievements"
  ON public.steam_player_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Service role inserts via edge function (no insert policy needed for anon/authenticated)
```

### 2. Edge Function — `steam-achievement-sync`

New function at `supabase/functions/steam-achievement-sync/index.ts`:

- Accepts authenticated request (JWT in Authorization header)
- Looks up user's `steam_id` from `profiles` table
- Queries `games` table for all rows with a non-null `steam_app_id`
- For each game, calls Steam API: `ISteamUserStats/GetPlayerAchievements/v0001?key=...&steamid=...&appid=...`
- Upserts results into `steam_player_achievements` using service role client
- Handles private profiles gracefully (Steam returns error → skip that game)
- Adds rate-limit guard: checks `synced_at` on existing rows and rejects if last sync was < 5 minutes ago
- Returns summary: `{ synced: number, games_checked: number, private_games: string[] }`

Config in `supabase/config.toml`:
```toml
[functions.steam-achievement-sync]
  verify_jwt = false
```

### 3. Hook Update — `usePlayerAchievements.ts`

Extend the existing hook to support `steam_achievement` criteria type:

- Add `steam_player_achievements` to the parallel fetch (filtered by `user_id`)
- Add `AutoCriteria` fields: `steam_app_id`, `achievement_name`
- Add new case in `evalCriteria`:

```typescript
case "steam_achievement": {
  const match = steamAchievements.find(
    sa => sa.steam_app_id === c.steam_app_id 
       && sa.achievement_api_name === c.achievement_name 
       && sa.achieved
  );
  return { pass: !!match, progress: match ? 1 : 0 };
}
```

### 4. Achievements Page — "Sync Steam" Button

Update `src/pages/Achievements.tsx`:

- Add a "Sync Steam Achievements" button in the header (only visible if user has a linked `steam_id`)
- Fetch user's profile to check for `steam_id`
- On click, invoke the edge function via `supabase.functions.invoke("steam-achievement-sync")`
- Show loading spinner during sync, toast on success/error
- Auto-invalidate `player-achievements` query on success

### 5. Admin Achievement Editor — Steam Criteria Option

Update `src/pages/admin/AdminAchievements.tsx` (DefForm):

- Add a third category option: "Steam Achievement (auto)"
- When selected, show dropdowns for:
  - **Game** — populated from `games` table (filtered to those with `steam_app_id`)
  - **Steam Achievement Name** — text input for the Steam API achievement key
- Save as `auto_criteria: { type: "steam_achievement", steam_app_id: "730", achievement_name: "ACH_NAME" }`

### Technical Details

- **STEAM_API_KEY** secret is already configured
- `steam_id` is already on the `profiles` table from the OpenID linking flow
- `steam_app_id` is already mapped on 16 games in the `games` table
- The `auto_criteria` JSON column on `achievement_definitions` is flexible — no schema change needed
- Steam API endpoint returns `{ playerstats: { achievements: [{ apiname, achieved, unlocktime }] } }`

### Files Changed

| File | Change |
|------|--------|
| Migration | Create `steam_player_achievements` table with RLS |
| `supabase/functions/steam-achievement-sync/index.ts` | New edge function |
| `supabase/config.toml` | Add `verify_jwt = false` for new function |
| `src/hooks/usePlayerAchievements.ts` | Add `steam_achievement` criteria type + fetch steam data |
| `src/pages/Achievements.tsx` | Add "Sync Steam" button |
| `src/pages/admin/AdminAchievements.tsx` | Add Steam achievement criteria option in DefForm |

