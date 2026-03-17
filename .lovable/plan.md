

## Fix: Hide Registration for Past Tournaments

Tournaments whose `start_date` has passed still show "Register" because the card only checks `t.status === "open"` — it never considers the actual date.

### Changes

**1. `src/components/tournaments/TournamentCard.tsx`**
- Add a date check: `const isPast = new Date(t.start_date) < new Date()`
- Update `canRegister` to also require `!isPast`
- When `isPast` and status is still "open", show a "Started" or "Closed" label instead of Register

**2. `src/pages/Tournaments.tsx`**
- In the default "Open" filter, exclude tournaments whose `start_date` has passed (unless the user is registered), so past tournaments don't clutter the default view
- Add a "Past" filter option so users can still find them if needed

**3. `src/hooks/useTournaments.ts`**
- Derive an `effective_status` field: if `status === "open"` but `start_date < now`, treat it as `"closed"` — this normalizes the display across the app without requiring a DB change

### Files to modify
| File | Change |
|------|--------|
| `src/hooks/useTournaments.ts` | Add `effective_status` derived field |
| `src/components/tournaments/TournamentCard.tsx` | Use `effective_status`; disable registration for past tournaments |
| `src/pages/Tournaments.tsx` | Filter out past-open tournaments from default "Open" view; add "Past" filter option |

