# Fix: Cannot delete prizes that have redemptions

## Why

The Prize Catalog "Delete" button runs a hard `DELETE` on `prizes`. When any redemption history exists (Sticker Pack has 6), Postgres blocks it via the `prize_redemptions_prize_id_fkey` foreign key. We need a way to remove prizes from view without destroying historical point-spend records.

## Approach: Soft delete (archive)

Keep redemption history intact. Add an `archived_at` flag to prizes, hide archived prizes from the player Prize Shop and the Catalog by default, and only allow true hard delete when a prize has zero redemptions.

## Changes

### 1. Database
- Add `archived_at timestamptz NULL` column to `prizes`.
- Index on `archived_at` for filtering.
- No FK changes. No data deletion.

### 2. Player Prize Shop (`/prize-shop`)
- Filter out prizes where `archived_at IS NOT NULL` (in addition to the existing `is_active` filter).

### 3. Moderator Prize Catalog (`ModeratorRedemptions.tsx`)
- Replace the trash icon's behavior with smart logic:
  - If the prize has **zero** redemptions: show "Delete" (hard delete, current behavior, with confirm).
  - If the prize has **any** redemptions: show "Archive" (sets `archived_at = now()`, with confirm explaining history is preserved).
- Add an "Archived" filter toggle on the Catalog tab so mods can view/restore archived prizes.
- Add an "Unarchive" action on archived prizes (clears `archived_at`).
- Redemption Requests tab continues to show all historical redemptions, including those for archived prizes.

### 4. Sticker Pack (immediate action)
- Per your choice, just toggle `is_active = false` on the Sticker Pack now. No archive, no delete. It will disappear from the player shop and stay in the catalog as inactive.

## Out of scope

- No changes to point refunds, redemption status, or the points wallet triggers.
- No changes to RLS beyond adding the archived flag (existing policies continue to apply).

## Technical notes

- Files touched: `supabase` migration (schema), `src/pages/PrizeShop.tsx` (filter), `src/pages/moderator/ModeratorRedemptions.tsx` (catalog UI + mutations), and one `UPDATE` to disable Sticker Pack.
- Redemption count per prize is already fetched alongside catalog data via the existing query — we'll extend it to drive the Delete-vs-Archive decision.
