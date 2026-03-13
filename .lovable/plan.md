

## Plan: Fix Achievement Not Saving/Displaying on Tournaments

### Root Cause

The `achievement_id` field is passed from the Create/Edit Tournament dialogs but **never reaches the database** because:

1. **Create mutation** (`src/hooks/useTournaments.ts` line 94-123): The type signature doesn't include `achievement_id`, so it's silently dropped.
2. **Update mutation** (`src/hooks/useTournamentManagement.ts` lines 331-374): `achievement_id` is missing from both the type signature AND the `.update()` payload. Same for `discord_role_id` and `image_url`.

The TournamentCard already renders `AchievementBadgeDisplay` when `achievement_id` exists — it just never gets saved to the DB.

### Changes

**1. `src/hooks/useTournaments.ts`** — Add `achievement_id` to the create mutation type:
- Add `achievement_id?: string;` to the `data` type (line ~110)

**2. `src/hooks/useTournamentManagement.ts`** — Add missing fields to the update mutation:
- Add `achievement_id`, `discord_role_id`, and `image_url` to the type signature (~line 332-350)
- Add these fields to the `.update()` payload (~line 354-372):
  - `achievement_id: details.achievement_id ?? null`
  - `discord_role_id: details.discord_role_id ?? null`
  - `image_url` (only if provided)

### Files Modified
| File | Change |
|------|--------|
| `src/hooks/useTournaments.ts` | Add `achievement_id` to create mutation type |
| `src/hooks/useTournamentManagement.ts` | Add `achievement_id`, `discord_role_id`, `image_url` to update mutation type and payload |

No database or UI changes needed — the dialogs and display components are already correct.

