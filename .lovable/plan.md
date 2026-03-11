

## Steam Integration Plan

### Overview
Add Steam account linking to user profiles, a `steam_app_id` field on the games table, and a "Launch on Steam" button on the Game Detail page.

### 1. Database Migration

**Add `steam_app_id` to `games` table:**
```sql
ALTER TABLE public.games ADD COLUMN steam_app_id text;
```

**Add `steam_id` and `steam_username` to `profiles` table:**
```sql
ALTER TABLE public.profiles ADD COLUMN steam_id text;
ALTER TABLE public.profiles ADD COLUMN steam_username text;
```

### 2. Edge Function: `steam-openid-callback`

Create `supabase/functions/steam-openid-callback/index.ts`:
- Receives the OpenID 2.0 callback parameters from Steam
- Validates the OpenID signature by calling Steam's `check_authentication` endpoint
- Extracts the Steam ID from the `claimed_id` URL
- Fetches the Steam display name via Steam Web API (`ISteamUser/GetPlayerSummaries`)
- Updates the user's `profiles` row with `steam_id` and `steam_username`
- Redirects back to `/profile?steam=linked`

Requires a **Steam Web API Key** secret (`STEAM_API_KEY`) — will use the `add_secret` tool to request it.

Add to `config.toml`:
```toml
[functions.steam-openid-callback]
  verify_jwt = false
```

### 3. Frontend: Steam Linking on Profile Settings

**`src/pages/ProfileSettings.tsx`** changes:
- Fetch and display `steam_id` / `steam_username` from profile
- Add a "Link Steam" button that redirects to Steam OpenID:
  ```
  https://steamcommunity.com/openid/login?openid.ns=...&openid.return_to=<edge-function-url>
  ```
- Show linked Steam username with an "Unlink" option
- Handle `?steam=linked` query param to show success toast

### 4. Frontend: Game Model & Admin Updates

**`src/hooks/useGames.ts`** — Add `steam_app_id: string | null` to the `Game` interface.

**`src/components/games/AddGameDialog.tsx`** — Add a "Steam App ID" input field so admins can map games to their Steam app IDs.

### 5. Frontend: Launch Button on Game Detail

**`src/pages/GameDetail.tsx`** — In the hero section next to the game info:
- If `game.steam_app_id` exists, show a "Launch on Steam" button
- The button links to `steam://run/<steam_app_id>` (opens the local Steam client)
- If the user has linked their Steam account, show a green indicator; otherwise show "Link Steam to verify ownership" hint
- Uses `window.location.href = steam://run/...` on click

### 6. Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `steam_app_id` to games, `steam_id`/`steam_username` to profiles |
| `supabase/functions/steam-openid-callback/index.ts` | New edge function |
| `src/pages/ProfileSettings.tsx` | Steam link/unlink UI |
| `src/hooks/useGames.ts` | Add `steam_app_id` to Game interface |
| `src/components/games/AddGameDialog.tsx` | Steam App ID input field |
| `src/pages/GameDetail.tsx` | "Launch on Steam" button |

### 7. Secret Required

A **Steam Web API Key** is needed for the edge function to validate OpenID and fetch player summaries. This is obtained free from https://steamcommunity.com/dev/apikey. Will prompt for it before implementing the edge function.

