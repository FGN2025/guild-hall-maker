

## Plan: Add All Pages to Page Appearance Manager

### Problem
The Page Appearance admin panel only shows the 6 pages that were manually seeded into the `managed_pages` database table. However, 17 pages in the app now use `<PageBackground>`, meaning 11 pages have no appearance controls.

### Solution
Create a database migration to insert the missing 11 pages into `managed_pages`. Use `INSERT ... ON CONFLICT DO NOTHING` so existing rows are preserved.

### Missing Pages to Add

| Slug | Label | Hero | Background |
|------|-------|------|------------|
| `challenges` | Challenges | yes | yes |
| `games` | Games | no | yes |
| `game-detail` | Game Detail | no | yes |
| `player-profile` | Player Profile | no | yes |
| `compare` | Player Comparison | no | yes |
| `calendar` | Tournament Calendar | no | yes |
| `profile` | Profile Settings | no | yes |
| `guide` | Player Guide | no | yes |
| `ladders` | Ladders | no | yes |
| `prize-shop` | Prize Shop | no | yes |
| `quests` | Quests | no | yes |

### Changes

| What | Detail |
|------|--------|
| **Database migration** | `INSERT INTO managed_pages` for all 11 missing slugs with appropriate `supports_hero` / `supports_background` flags and sequential `display_order` values starting after existing rows |

Single migration, no code file changes needed.

