

# Admin Tournament Views: List + Card Grid with Details

## Current State
The admin tournament page (`AdminTournaments.tsx`) only has a table/list view with Name, Game, Status, Players, Start Date, and a Delete action. There is no card view or details dialog like the user-facing tournament page has.

## Plan

### 1. Add view toggle (List / Grid) to AdminTournaments
- Add a toggle button pair (List icon / Grid icon) in the header area next to the title
- Store the active view in local state (`viewMode: "list" | "grid"`)

### 2. Add search and status filter
- Add a search input and status filter dropdown (matching the user-facing page pattern) so admins can quickly find tournaments

### 3. Build admin card grid view
- When in grid mode, render tournaments using a card layout similar to `TournamentCard` but adapted for admin context:
  - Show hero image, name, game, status badge, format, date, player count, prize
  - Replace Register/Unregister buttons with admin actions: **View Bracket**, **Edit** (link to manage page), **Delete**

### 4. Add admin tournament details dialog
- Clicking a card opens a details dialog (similar to `TournamentDetailsDialog`) showing full tournament info: description, rules, dates, players, prize, points config
- Include admin action buttons: **View Bracket**, **Manage**, **Delete**

### 5. Keep existing list view
- The current table view remains as the "list" option with all existing functionality (delete button, bracket link)

### Files Changed
- **`src/pages/admin/AdminTournaments.tsx`** — Major rewrite: add view toggle, search/filter bar, grid view with admin cards, details dialog, alongside existing table view

No database changes needed — the existing RLS policy and query already cover this.

