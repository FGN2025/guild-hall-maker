

## Findings: Access Control Gaps for Edit/View/Promo/Delete Buttons

After reviewing all relevant files, here is the current state and the issues found:

### Current Routing Protection

| Page | Route Guard | Who Can Access |
|---|---|---|
| `/admin/tournaments` | `AdminRoute` | Admin only |
| `/admin/challenges` | `AdminRoute` | Admin only |
| `/moderator/tournaments` | `ModeratorRoute` | Admin + Moderator |
| `/moderator/challenges` | `ModeratorRoute` | Admin + Moderator |
| `/tournaments/:id/manage` | `ProtectedRoute` | **Any authenticated user** |
| `/tournaments/:id` (detail) | `ProtectedRoute` or `ConditionalLayout` | Any user |
| `/challenges/:id` (detail) | Same | Any user |
| `/quests/:id` (detail) | Same | Any user |

### Issues Found

1. **`TournamentManage.tsx`** — No role check at all. Any authenticated user who knows the URL can access the full tournament management page (edit settings, generate brackets, score matches). This is a security gap.

2. **`TournamentDetail.tsx`** (line 188) — "Manage Tournament" button uses `isCreator` only. Admins and Moderators who didn't create the tournament cannot see the manage button. Should be `isAdmin || isModerator || isCreator`.

3. **`QuestDetail.tsx`** (line 152) — Admin action bar only checks `isAdmin`. Moderators cannot see Edit/Delete buttons on the quest detail page. Should be `isAdmin || isModerator`.

4. **Moderator Tournaments page** (`ModeratorTournaments.tsx`) — Still shows old "Manage" label (not "Edit"), and is missing the View and Promo buttons that were added to the admin page. Also shows Delete to moderators, but per existing rules only Admins should delete.

5. **Moderator Challenges page** (`ModeratorChallenges.tsx`) — Missing Promo button. Shows Delete to moderators (should be admin-only per existing rules).

6. **Delete button visibility** — Currently shown to all moderators in moderator pages. Per the documented rule ("only Administrators have the authority to delete"), Delete should be restricted to `isAdmin` only.

### Plan

#### 1. `src/pages/TournamentManage.tsx` — Add access control
- Import `useAuth` and check `isAdmin || isModerator || (user?.id === tournament?.created_by)`
- If unauthorized, redirect to `/tournaments/:id` with an access denied toast

#### 2. `src/pages/TournamentDetail.tsx` — Fix manage button visibility
- Change line 188 from `isCreator` to `isAdmin || isModerator || isCreator`

#### 3. `src/pages/QuestDetail.tsx` — Add moderator access
- Change line 152 from `isAdmin` to `isAdmin || isModerator`
- Also import `isModerator` from `useAuth`

#### 4. `src/pages/moderator/ModeratorTournaments.tsx` — Unify buttons
- Rename "Manage" to "Edit", add View and Promo buttons (matching admin page)
- Import `EventPromoEditorDialog`, `buildTournamentPromo`, `Megaphone`, `Eye`
- Restrict Delete button to `isAdmin` only

#### 5. `src/pages/moderator/ModeratorChallenges.tsx` — Add Promo, restrict Delete
- Add Promo button (import `EventPromoEditorDialog`, `buildChallengePromo`, `Megaphone`)
- Restrict Delete button to `isAdmin` only

#### 6. `src/components/quests/AdminQuestsPanel.tsx` — Restrict Delete when used in moderator context
- Accept an optional `isAdmin` prop (or read from `useAuth` directly)
- Only show Delete button when `isAdmin` is true

### Files to modify
1. `src/pages/TournamentManage.tsx`
2. `src/pages/TournamentDetail.tsx`
3. `src/pages/QuestDetail.tsx`
4. `src/pages/moderator/ModeratorTournaments.tsx`
5. `src/pages/moderator/ModeratorChallenges.tsx`
6. `src/components/quests/AdminQuestsPanel.tsx`

