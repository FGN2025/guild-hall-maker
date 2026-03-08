

## Fix: Restrict Enrollment/Registration Counts to Platform Admins Only

### Problem
Enrollment and registration counts are currently visible to moderators and would also be visible to tenant admins if they access these views. The `isAdmin` guard exists in tournament components but is missing entirely from `ModeratorChallenges.tsx`. The requirement is: **only platform admins** see these counts — no moderators, no tenant roles.

### Files to Change

**1. `src/pages/moderator/ModeratorChallenges.tsx`** (3 locations)
- Add `isAdmin` from `useAuth()` (line 45)
- **Table view** (line 277/291): Conditionally render "Enrolled" column header and cell — hide for non-admins
- **Card grid** (lines 354-358): Conditionally render the "Enrolled" stat block — hide for non-admins
- **Detail dialog** (line 551): Remove or conditionally render the "Enrolled" entry — hide for non-admins

**2. `src/components/challenges/ChallengeCard.tsx`** — Already guarded. No change needed.

**3. `src/components/tournaments/TournamentCard.tsx`** — Already guarded. No change needed.

**4. `src/components/tournaments/TournamentDetailsDialog.tsx`** — Already guarded. No change needed.

**5. `src/pages/moderator/ModeratorTournaments.tsx`** — Already guarded. No change needed.

**6. Create test: `src/test/data-shielding.test.ts`**
- Unit tests using Vitest + React Testing Library
- Mock `useAuth` to return different role combinations
- Test `ChallengeCard` renders enrollment count only when `isAdmin: true`
- Test `TournamentCard` renders registration ratio only when `isAdmin: true`
- Verify non-admin roles (moderator, tenant admin) see "max" only, no enrollment/registration counts

### Summary
One file needs fixing (`ModeratorChallenges.tsx`), all other components are already correctly guarded. A test suite will confirm the shielding works across roles.

