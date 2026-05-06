# Prize Shop: Caps & Restrictions

## Current state
- `prizes.quantity_available` (nullable int) — global stock cap. Decremented on approval via `decrement_prize_stock` trigger. Already editable in the moderator Prize form.
- `prizes.points_cost`, `rarity`, `dollar_value` — used by the budget card (`PrizeBudgetCard`) to track $1,500/mo platform spend.
- No per-user redemption limit. A single player can request the same prize repeatedly within a month.
- `season_scores.monthly_player_cap` exists for points earned, not for prize redemptions.

## What we'll add

### 1. Per-prize monthly limit per user
- New column `prizes.max_per_user_per_month integer NULL` (NULL = unlimited).
- Edit + create UI in `PrizeFormDialog` — new field "Max per user / month (blank = unlimited)" alongside Quantity.
- Display on the shop card when set: "Limit: X per month".

### 2. Enforcement (server-side, authoritative)
- New trigger `enforce_prize_redemption_limits` BEFORE INSERT on `prize_redemptions`:
  - If `prizes.quantity_available <= 0` → reject "Out of stock".
  - If `max_per_user_per_month` set → count user's redemptions for this prize in current calendar month with status in (`pending`, `approved`, `fulfilled`) and reject if >= cap.
  - Pending counts toward the cap so users can't queue duplicates while waiting on review.
- RAISE EXCEPTION with clear, user-readable message.

### 3. Client-side UX (advisory, matches server)
- In `PrizeShop.tsx`: query user's current-month redemption count per prize, show "X / Y this month" and disable the Redeem button when limit reached. Same for out-of-stock (already partially handled).
- Confirm dialog shows remaining monthly allowance.

### 4. Moderator visibility
- In `ModeratorRedemptions.tsx`, when reviewing a request, show "User has redeemed N of this prize this month".

## Out of scope (ask if you want them)
- Global per-user monthly redemption cap across ALL prizes.
- Per-rarity caps (e.g., max 1 legendary/month/user).
- Cooldown windows (e.g., 24h between redemptions).
- Tying caps to season instead of calendar month.

## Files touched
- migration: add column + BEFORE INSERT trigger on `prize_redemptions`
- `src/components/moderator/PrizeFormDialog.tsx` — new field
- `src/pages/PrizeShop.tsx` — fetch monthly counts, disable + label
- `src/pages/moderator/ModeratorRedemptions.tsx` — show monthly count per row
- types regenerate automatically after migration
