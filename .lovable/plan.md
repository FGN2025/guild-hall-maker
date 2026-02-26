

## Enable Background Image Management for Tournaments Page

### Problem
The Tournaments page in the Page Appearance manager only shows "Hero Banner" controls because its `supports_background` flag is set to `false` in the database. All other main pages have background management enabled.

### Solution
Run a single database migration to flip the `supports_background` flag to `true` for the Tournaments managed page entry.

### What Changes
- **One SQL migration**: `UPDATE managed_pages SET supports_background = true WHERE slug = 'tournaments';`
- **No code changes required** -- the Page Appearance manager already renders the Background sub-section (with Upload, Generate AI, opacity slider, Save/Clear) for any page where `supports_background = true`.

### Result
After the migration, the Tournaments row in the Page Appearance manager will show both the Hero Banner and Background controls, matching the layout you see on pages like Leaderboard.

