

# Multi-Date Tournament Creation -- Assessment & Plan

## What the User Wants
When creating a tournament, instead of picking a single start date, the creator can select multiple dates. Each date generates a separate tournament record in the database, sharing the same name (with a date suffix), game, format, rules, prizes, and settings.

## Level of Effort: **Low-Medium** (one file change, no database changes)

The current `CreateTournamentDialog` already calls `onCreate()` with a single data payload. The simplest approach is to allow multiple date selection in the dialog and loop over each date, calling `onCreate()` once per date. No schema changes are needed -- each date simply produces an independent tournament row.

## Implementation

### Changes to `src/components/tournaments/CreateTournamentDialog.tsx`

1. **Replace single date picker with multi-date picker**
   - Change `startDate` state from `Date | undefined` to `Date[]`
   - Switch `Calendar` from `mode="single"` to `mode="multiple"`
   - Display selected date count (e.g., "3 dates selected") in the trigger button

2. **Add a visual list of selected dates** below the picker showing each date as a removable chip/tag so the creator can review and remove individual dates.

3. **Update submit logic** to loop over each selected date:
   ```text
   for each date in selectedDates:
     combinedDate = date + startTime
     onCreate({ ...sharedFields, 
       name: dates.length > 1 ? `${name} - ${formatDate(date)}` : name,
       start_date: combinedDate 
     })
   ```

4. **Update button label** to reflect count: "Create 3 Tournaments" vs "Create Tournament"

5. **Validation**: Require at least one date selected; disable submit if none.

### Files Changed

| File | Action |
|---|---|
| `src/components/tournaments/CreateTournamentDialog.tsx` | Update -- multi-date selection + loop submit |

### What Does NOT Change
- Database schema (no new tables or columns)
- `useTournaments` hook (each `onCreate` call is identical to today)
- Tournament detail/bracket pages
- RLS policies

