

## Discord Identity Verification -- Implementation Plan

This plan implements mandatory Discord account linking as a secondary identity gate for all authenticated players. Players who haven't linked Discord will be redirected to a dedicated page before they can access the platform.

---

### Step 1: Request Discord Secrets

Three secrets need to be stored securely in the backend:

- **DISCORD_CLIENT_ID** -- Your application's client ID from the Discord Developer Portal
- **DISCORD_CLIENT_SECRET** -- Your application's client secret
- **DISCORD_BOT_TOKEN** -- Your bot's token for server role management

These will be requested using the secure secrets tool before any code is written.

---

### Step 2: Database Migration

Add Discord columns to the existing `profiles` table:

- `discord_id` (TEXT, UNIQUE) -- Prevents two FGN accounts from linking the same Discord
- `discord_username` (TEXT) -- Displayed in brackets and leaderboards
- `discord_avatar` (TEXT) -- Discord avatar hash for display
- `discord_linked_at` (TIMESTAMPTZ) -- Timestamp of when the link was established

---

### Step 3: Backend Function -- `discord-oauth-callback`

A new backend function that:

1. Validates the authenticated user via JWT
2. Receives a Discord OAuth2 authorization `code` and `redirect_uri` from the client
3. Exchanges the code with Discord's token endpoint using the server-side secret
4. Calls Discord `/users/@me` to retrieve Discord ID, username, and avatar
5. Checks the `discord_id` isn't already claimed by another player (unique constraint)
6. Updates the authenticated user's profile row with Discord data
7. Optionally assigns a "Verified Player" role in the FGN Discord server using the bot token
8. Returns the linked Discord username to the client

Configuration: `verify_jwt = false` in `config.toml` with in-code JWT validation via `getClaims()`.

---

### Step 4: New Page -- `/link-discord`

Create `src/pages/LinkDiscord.tsx` with:

- Branded card explaining why Discord is required ("Discord is used for tournament communication, brackets, and player identity")
- Helpful tip: "Don't have a Discord account yet? You'll be able to create one for free during the linking process."
- "Link Discord Account" button that redirects to Discord's OAuth2 authorize URL with scopes `identify` and `guilds.members.read`
- Callback handling: reads the `code` query parameter, calls the backend function, shows success confirmation
- On success, redirects to the Dashboard

---

### Step 5: Auth Context Updates

Modify `src/contexts/AuthContext.tsx`:

- Add `discordLinked` boolean state (default `false`)
- Fetch `discord_id` from the user's profile alongside the role check
- Set `discordLinked = true` when `discord_id` is non-null

---

### Step 6: Protected Route Gate

Modify `src/components/ProtectedRoute.tsx`:

- After confirming authentication, check `discordLinked` from AuthContext
- If `false`, redirect to `/link-discord`
- Exempt `/link-discord` and `/profile` from the Discord check so users can still access those pages

---

### Step 7: App.tsx Route Updates

- Add `/link-discord` as an authenticated but non-Discord-gated route (inside AuthProvider, accessible to logged-in users who haven't linked Discord yet)

---

### Step 8: Bracket and Tournament Display -- Discord Usernames

Update two hooks to prefer `discord_username` as the displayed player name:

- **`src/hooks/useBracket.ts`**: Add `discord_username` to the profile select query. Name resolution priority: `discord_username` > `gamer_tag` > `display_name`
- **`src/hooks/useTournamentManagement.ts`**: Same change to profile queries and the `profileMap` construction

---

### Step 9: Profile Settings -- Discord Card

Update `src/pages/ProfileSettings.tsx`:

- Add a Discord section card showing:
  - Linked Discord username and avatar (if linked)
  - "Unlink Discord" button with a warning that unlinking blocks platform access until re-linked
  - "Re-link Discord" option to switch to a different Discord account

---

### Step 10: Guide Updates

- **Player Guide** (`src/pages/PlayerGuide.tsx`): Add a bullet to the "Getting Started" section about Discord linking being required after registration
- **Admin Guide** (`src/pages/admin/AdminGuide.tsx`): Add a section about Discord integration management

---

### Implementation Order

1. Request and store the three Discord secrets
2. Run database migration (add columns to profiles)
3. Create the `discord-oauth-callback` backend function
4. Create the `LinkDiscord.tsx` page
5. Update AuthContext with `discordLinked` state
6. Update ProtectedRoute to enforce Discord gate
7. Update App.tsx routes
8. Update bracket/tournament hooks for Discord username display
9. Update ProfileSettings with Discord management card
10. Update Player Guide and Admin Guide

### Files Created
- `supabase/functions/discord-oauth-callback/index.ts`
- `src/pages/LinkDiscord.tsx`

### Files Modified
- `supabase/config.toml` (add function config)
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/App.tsx`
- `src/hooks/useBracket.ts`
- `src/hooks/useTournamentManagement.ts`
- `src/pages/ProfileSettings.tsx`
- `src/pages/PlayerGuide.tsx`
- `src/pages/admin/AdminGuide.tsx`

