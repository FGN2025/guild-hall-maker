

## Make Home Page Stats Admin-Editable

Store the three hero stats (Players, Tournaments, Operators Served) as an `app_settings` row so admins can override them from the Admin Settings page.

### 1. Add `app_settings` row for hero stats

Use the insert tool to upsert a new `app_settings` entry:
```sql
INSERT INTO app_settings (key, value)
VALUES ('hero_stats_overrides', '{"players": 4740, "tournaments": null, "operators": null}')
ON CONFLICT (key) DO NOTHING;
```

Values of `null` mean "use live count from the database." A number means "use this fixed value."

### 2. Update `src/components/HeroSection.tsx`

In `useHeroStats`, fetch the `hero_stats_overrides` setting alongside existing queries. For each stat, if the override is a number use it; otherwise fall back to the dynamic calculation. This also addresses the earlier request to show 4740 for players.

### 3. Add Hero Stats editor to `src/pages/admin/AdminSettings.tsx`

Add a new card section "Home Page Stats" with three number inputs:
- **Players** (default: 4740)
- **Tournaments** (leave blank for live count)
- **Operators Served** (leave blank for live count)

Each field saves to the JSON `hero_stats_overrides` key. Empty/cleared fields save as `null` to revert to dynamic counts. Include helper text: "Leave blank to use live database count."

### Files changed
- `src/components/HeroSection.tsx` — read overrides, apply them
- `src/pages/admin/AdminSettings.tsx` — new "Home Page Stats" card with 3 inputs + save button

