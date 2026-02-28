

## Prize Pool: Physical Prize or Weighted Value

### Overview
Replace the freeform Prize Pool text field with a structured selector that supports two modes:
1. **Physical Prize** -- select an item from the Prize Shop catalog
2. **Point/Cash Value** -- enter a total value that is displayed with a weighted breakdown for 1st, 2nd, and 3rd place

### Database Changes
Add two new columns to the `tournaments` table:
- `prize_type` (text, default `'none'`) -- one of `'none'`, `'physical'`, or `'value'`
- `prize_id` (UUID, nullable, FK to `prizes.id`) -- links to the Prize Shop item when type is `'physical'`

The existing `prize_pool` text column continues to store the display value (e.g., "$5,000") when `prize_type = 'value'`.

### Frontend Changes

**1. Create Tournament Dialog and Edit Tournament Dialog**
Replace the single "Prize Pool" text input with a Prize Type selector:

- **Radio/Tab toggle**: "None", "Physical Prize", "Value"
- **Physical Prize mode**: Show a dropdown populated from the `prizes` table (active items only), displaying name and image thumbnail. Stores `prize_id` and sets `prize_pool` to the prize name for display.
- **Value mode**: Show a text input for the total value (e.g., "$5,000"). Below it, display a read-only weighted breakdown based on the Season Points ratios:
  - 1st Place share: `(points_first / total_points) * value`
  - 2nd Place share: `(points_second / total_points) * value`
  - 3rd Place share: `(points_third / total_points) * value`

**2. Tournament Card and Detail Page**
- When `prize_type = 'physical'`, display the prize name (and optionally its image)
- When `prize_type = 'value'`, display the value with the weighted breakdown
- When `prize_type = 'none'`, show "No Prize" or hide the section

### Display Logic for Value Breakdown
Using the Season Points values as weights:
```
total_weight = points_first + points_second + points_third
1st gets: value * (points_first / total_weight)
2nd gets: value * (points_second / total_weight)  
3rd gets: value * (points_third / total_weight)
```
Example: $5,000 with points 10/5/3 = 1st: $2,778, 2nd: $1,389, 3rd: $833

### Files Modified
- New database migration (add `prize_type` and `prize_id` columns)
- `src/components/tournaments/CreateTournamentDialog.tsx` -- new prize type UI
- `src/components/tournaments/EditTournamentDialog.tsx` -- same updates
- `src/components/tournaments/TournamentCard.tsx` -- updated prize display
- `src/pages/TournamentDetail.tsx` -- updated prize detail view

