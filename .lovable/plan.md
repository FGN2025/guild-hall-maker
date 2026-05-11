## Plan

### 1. Filter by Game — Oversight + Evidence Review

Both `src/pages/moderator/ModeratorChallenges.tsx` and `src/pages/admin/AdminChallenges.tsx`:

- **Oversight tab**: add a `gameFilter` `Select` next to the existing Difficulty/Status filters. Options derived from `[...new Set(challenges.map(c => c.games?.name).filter(Boolean))].sort()` plus an "All Games" option. (AdminChallenges already has this pattern at line 161/166 — port the same `useMemo` + `Select` to ModeratorChallenges.)
- **Evidence Review tab**: add the same Game `Select` above the "Select Challenge to Review" dropdown. When a game is chosen, the challenge picker only lists that game's challenges. Picking a different game clears `reviewChallengeId`.
- One shared `gameFilter` state per page covers both tabs (consistent context as the user switches tabs).

### 2. Mirror recent fixes into AdminChallenges

Port the four moderator-side improvements into `src/pages/admin/AdminChallenges.tsx` so admins get the same Evidence Review UX at `/admin/challenges`:

1. **Per-task evidence grouping** — iterate `reviewTasks`, render each task's evidence; tasks with zero evidence show a dashed "No evidence uploaded for this task yet" tile (replaces the empty media placeholder).
2. **Submission-state notice** — when `enrollment.status` is not `submitted/completed/rejected`, show the yellow "Awaiting player submission" banner explaining why approve buttons are hidden.
3. **Force submit (admin)** — button inside that banner that flips the enrollment to `submitted` via the same mutation, so admins can unblock test/stuck enrollments without bothering the player.
4. **video_link rendering** — YouTube + Twitch (clip & video) iframe branches matching `ChallengeDetail.tsx` lines 242–276, plus `preload="metadata"` on `<video>` tags, so YouTube/Twitch evidence renders inline instead of falling through to a generic icon.

### Files

- `src/pages/moderator/ModeratorChallenges.tsx` — add Game filter to Oversight + Evidence Review.
- `src/pages/admin/AdminChallenges.tsx` — add Game filter to Evidence Review (Oversight already has one), plus the four ported fixes.

No DB, RLS, or routing changes. ModeratorRoute already permits admins, and AdminSidebar already links to `/admin/challenges`.
