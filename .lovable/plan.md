

## Plan: Tenant Player Achievements Card

### Problem
Tenants have no visibility into which of their players have earned achievements. This data is valuable for promotions and player recognition.

### Approach
Create a new hook and component that cross-references tenant players (from `user_service_interests` and matched `legacy_users`) with `player_achievements` data, then display an achievements leaderboard card on the Tenant Dashboard and a detailed view on the Players page.

### Data Flow
1. Get all `user_id`s belonging to this tenant:
   - `user_service_interests.user_id` where `tenant_id` matches
   - `legacy_users.matched_user_id` where `tenant_id` matches and `matched_user_id IS NOT NULL`
2. Query `player_achievements` for those user IDs, joined with `achievement_definitions` for tier/name
3. Group by user, count unlocked achievements and tier breakdown
4. Join with `profiles` for display names and avatars

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useTenantAchievements.ts` | Hook that fetches achievement summaries scoped to a tenant's player base |
| `src/components/tenant/TenantAchievementsCard.tsx` | Leaderboard-style card showing top achievers with tier badges |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/tenant/TenantDashboard.tsx` | Add the achievements card below the Player Directory link |
| `src/pages/tenant/TenantPlayers.tsx` | Add an achievements column or badge to the player table for matched players |

### Achievements Card UI
- Title: "Player Achievements" with a trophy icon
- Table/list of players ranked by total unlocked achievements
- Each row: avatar, display name, unlocked count, tier breakdown (bronze/silver/gold/platinum badges)
- Empty state: "No players have earned achievements yet"
- Link to full player profiles for more detail

### Hook Logic (`useTenantAchievements`)
```text
1. Fetch user_service_interests.user_id + legacy_users.matched_user_id for tenant
2. Fetch player_achievements WHERE user_id IN (tenant_user_ids)
   JOIN achievement_definitions for tier info
3. Group by user_id → { unlocked, tiers: {bronze, silver, gold, platinum} }
4. Fetch profiles for display_name, avatar_url
5. Sort by unlocked DESC, return top players
```

