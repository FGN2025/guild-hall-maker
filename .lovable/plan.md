

## Plan: Public Tournaments & Challenges + Sidebar Reorder

### Overview
Allow unauthenticated visitors to browse Tournaments and Challenges pages (read-only). Action buttons (register, enroll) show "Sign in" prompts for anonymous users. Reorder sidebar so Challenges appears directly after Tournaments.

---

### 1. Database Migration — Add anon SELECT policies

**Challenges table**: Current SELECT is `authenticated` only. Add anon policy:
```sql
CREATE POLICY "Anon can read active challenges" ON public.challenges
  FOR SELECT TO anon USING (is_active = true);
```

**Challenge enrollments table**: Needed for enrollment count display. Add anon read:
```sql
CREATE POLICY "Anon can read enrollments" ON public.challenge_enrollments
  FOR SELECT TO anon USING (true);
```

**Games table**: Already has public SELECT — no change needed.
**Tournaments / tournament_registrations / match_results**: Already have public/anon SELECT — no change needed.

---

### 2. New `PublicLayout.tsx`
A lightweight layout for unauthenticated users viewing public pages. Uses the existing `Navbar` component + `<Outlet />` + simple footer. No sidebar, no coach button.

### 3. New `ConditionalLayout.tsx`
Auth-aware wrapper that decides which layout to render:
- **Not logged in** → `PublicLayout` (navbar-based)
- **Logged in + Discord linked (or admin)** → `AppLayout` (sidebar-based)
- **Logged in + no Discord** → redirect to `/link-discord`

### 4. Route Changes in `App.tsx`
Move these routes out of `ProtectedRoute > AppLayout` into a new `ConditionalLayout` group:
```
/tournaments
/tournaments/:id
/tournaments/:id/bracket
/challenges
/challenges/:id
```
The remaining routes stay inside `ProtectedRoute > AppLayout` as-is.

### 5. Page Component Auth Gating

**`Tournaments.tsx`**: Hide "Create Tournament" button when no user. The `useTournaments` hook already handles `user ? ... : false` for `is_registered`.

**`TournamentDetail.tsx`**: Replace register/unregister button with a "Sign in to register" link (`<Link to="/auth">`) when no user. Hide manage controls.

**`Challenges.tsx`**: The `myEnrollments` query already has `enabled: !!user` — safe. Hide enrollment-dependent UI (completed/enrolled badges) for anon users. Show "Sign in to participate" prompt.

**`ChallengeDetail.tsx`**: Gate enroll button and evidence upload behind `!!user`. Show sign-in prompt instead.

**`TournamentBracket.tsx`**: Read-only view, should work as-is with no auth changes needed.

### 6. Sidebar & Navbar Reorder
In both `AppSidebar.tsx` and `Navbar.tsx`, move Challenges (`/challenges`) to appear directly after Tournaments:

```
Tournaments → Challenges → Calendar → Games → Dashboard → ...
```

---

### Files Summary

| File | Action |
|------|--------|
| Migration (1 file) | Add anon SELECT on `challenges` and `challenge_enrollments` |
| `src/components/PublicLayout.tsx` | New — Navbar + Outlet for anon users |
| `src/components/ConditionalLayout.tsx` | New — auth-aware layout switcher |
| `src/App.tsx` | Move 5 routes to ConditionalLayout group |
| `src/pages/Tournaments.tsx` | Gate create button behind `!!user` |
| `src/pages/TournamentDetail.tsx` | Gate register action, show sign-in prompt |
| `src/pages/Challenges.tsx` | Gate enrollment UI, show sign-in prompt |
| `src/pages/ChallengeDetail.tsx` | Gate enroll/evidence actions |
| `src/components/AppSidebar.tsx` | Reorder: Challenges after Tournaments |
| `src/components/Navbar.tsx` | Match sidebar order |

**Total: 8 files modified, 2 new files, 1 migration. No architectural risk.**

