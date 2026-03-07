

# Surface Event Promo Editor on the Marketing Library Top Level

## Problem
The "From Event" promo button is currently buried inside the `CampaignAssetsDialog` (only visible after clicking into a specific campaign). Users expect to see an event-based promo creation option at the top level of the Marketing Library page.

## Plan

### Add a top-level "Event Promo" button next to "New Campaign"
In `src/pages/admin/AdminMarketing.tsx`:

1. Add a `promoPickerOpen` state at the top-level component (not just inside `CampaignAssetsDialog`)
2. Add a "From Event" button in the header bar next to "New Campaign"
3. Wire `PromoPickerDialog` at the top level with an `onSave` handler that uploads the generated blob directly to the media library (same logic as `EventPromoEditorDialog.handleSave` in the existing `EventPromoEditor.tsx`)
4. Show a success toast after save

### Files Changed

| File | Change |
|---|---|
| `src/pages/admin/AdminMarketing.tsx` | Add top-level `promoPickerOpen` state, "Event Promo" button in header, and `PromoPickerDialog` instance with direct-to-media-library save handler |

No database or backend changes needed.

