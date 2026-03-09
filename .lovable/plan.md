

## Updated Plan: "Players" Stat on Home Page

### Finding
- `profiles` table: **19** rows (registered platform users)
- `legacy_users` table: **4,740** rows (imported historical users)
- Combined: **4,759**

The original plan to count only `profiles` was incorrect. The total user base is profiles + legacy users.

### Updated Approach

In `src/components/HeroSection.tsx`, update `useHeroStats` to:

1. Count `profiles` rows (head-only, exact count)
2. Count `legacy_users` rows (head-only, exact count)
3. Sum both + 2,000 offset
4. Rename label from "Active Players" to "Players"

```typescript
const [profilesRes, legacyRes, ...] = await Promise.all([
  supabase.from("profiles").select("id", { count: "exact", head: true }),
  supabase.from("legacy_users").select("id", { count: "exact", head: true }),
  // keep tournaments + tenants queries
]);

const players = (profilesRes.count ?? 0) + (legacyRes.count ?? 0) + 2000;
```

This removes the tournament-registrations distinct-player logic and the `historical_player_count_offset` setting lookup (no longer needed since the offset is hardcoded at 2,000).

**Result today:** 19 + 4,740 + 2,000 = **6,759 Players**

### File changed
- `src/components/HeroSection.tsx` — simplify player count logic, rename label

