

## Plan: Split Tournaments into Tournaments, Challenges, and Quests Cards

Currently the Admin Dashboard shows 4 stat cards: Total Users, Tournaments, Media Assets, Active Seasons. The task is to replace the single "Tournaments" card with three separate cards for Tournaments, Challenges, and Quests.

### Changes to `src/pages/admin/AdminDashboard.tsx`

1. **Add two more count queries** in the `queryFn`: one for `challenges` and one for `quests`, both using `select("id", { count: "exact", head: true })`.

2. **Update the cards array** from 4 to 6 cards:
   - Total Users (unchanged)
   - Tournaments (unchanged)
   - **Challenges** (new) — links to `/admin/challenges`, uses `Target` icon, orange color
   - **Quests** (new) — links to `/admin/challenges`, uses `Compass` or `Scroll` icon, cyan color
   - Media Assets (unchanged)
   - Active Seasons (unchanged)

3. **Update grid** to accommodate 6 cards: change `lg:grid-cols-4` to `lg:grid-cols-3` (2 rows of 3) for a balanced layout.

4. **Add icons import**: `Target` and `Compass` from `lucide-react`.

No database or backend changes needed — both tables already have admin SELECT policies.

