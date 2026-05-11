# Player Dashboard — Add Quests, Challenges & Academy Skill Passport

Counting mode: **Lifetime** (every row in `*_completions` for the user, no season filter).

## Gaps closed

| Today | After |
|---|---|
| Only `tournament_registrations` + `match_results` are read | + `challenge_enrollments`, `challenge_completions`, `quest_enrollments`, `quest_completions` |
| 4 stat tiles all about tournaments | 2 rows × 4 tiles covering tournaments, challenges, quests, points |
| No surface for active/recent challenges or quests | Two new panels under the existing tournaments/matches grid |
| No link to FGN Academy even when the player is synced | Conditional Skill Passport card under the Points Wallet |

## Layout

```
WELCOME BACK
Player Dashboard
─────────────────────────────────────────────────────────────
[Tournaments Reg] [Challenges Done] [Quests Done]   [Win Rate]   ← row 1
[Matches Played]  [Matches Won]     [Total Earned]  [Spendable]  ← row 2

[ Points Wallet (existing) ................................ ]
[ Academy Skill Passport ↗ (only if academyLinked) ........ ]   ← NEW

┌─ My Tournaments (existing) ─┐ ┌─ Recent Matches (existing) ┐
└─────────────────────────────┘ └─────────────────────────────┘
┌─ My Challenges (NEW) ───────┐ ┌─ My Quests (NEW) ──────────┐
│ active first, then          │ │ active first, then         │
│ recent completed (≤30d),    │ │ recent completed (≤30d),   │
│ capped at 5                 │ │ capped at 5                │
└─────────────────────────────┘ └─────────────────────────────┘
```

## Work

### 1. `src/hooks/useDashboard.ts` — extend
Add two parallel react-query queries (`staleTime: 60_000`, `enabled: !!user`):

- **Challenges:** read `challenge_enrollments` for user → batch `challenges(id, name, game_id, points_reward, image_url)` lookup → `challenge_completions(challenge_id, awarded_points, completed_at, academy_synced)` for the same set. Return `{ active, completed, totalCompleted, totalPoints, academyLinked }` where `academyLinked = completions.some(c => c.academy_synced === true)`.
- **Quests:** same shape against `quest_enrollments` + `quests` + `quest_completions` (no academy field).

Extend `DashboardStats`:
```ts
{
  tournamentsRegistered, matchesPlayed, matchesWon, winRate,
  challengesCompleted, questsCompleted,
  totalPointsEarned, pointsAvailable
}
```

Fold a third query for `profiles.points` + `profiles.points_available` so the two new "points" tiles render in the same pass as the rest.

### 2. `src/pages/Dashboard.tsx` — restructure
- Replace 4-tile grid with 2 rows × 4 tiles (`grid grid-cols-2 lg:grid-cols-4`). Keep `glow-card` + cyan icon styling. Icons: `Target` (challenges), `Compass` (quests), `Wallet` (Total Earned), `Coins` (Spendable).
- Add **Academy Skill Passport** card directly under `<PointsWalletCard />`, rendered only when `academyLinked`. Slim card: small academy mark + heading "FGN Academy Skill Passport" + subline; right side outline button "Open Skill Passport ↗" → opens computed URL in new tab.
- Add **My Challenges** + **My Quests** panels in a new `grid lg:grid-cols-2 gap-6` row beneath the existing tournaments/matches grid. Empty states with "Browse Challenges" / "Browse Quests" CTAs. Rows show name, status badge, points chip (`+N pts` completed, `N pts` active), → `/challenges/:id` or `/quests/:id`.
- Extend skeleton state to cover 8 stat tiles + 4 panels.

### 3. Academy URL helper (NEW: `src/lib/academyPassport.ts`)
- One react-query call (5min staleTime) for the active `tenant_integrations` row where `provider_type='fgn_academy' and is_active=true`.
- `base = additional_config.passport_base_url ?? stripApiPath(additional_config.api_url) ?? 'https://fgn.academy'`
- `passportUrl = ${base}/passport?email=${encodeURIComponent(user.email)}`
- Single string change later if Academy lands a different route.

### 4. Verification
- React Query devtools: 4 dashboard queries + 1 cached integration lookup.
- Smoke as a player with one synced challenge completion: academy card appears, "Open Skill Passport" opens with the email querystring.
- Regression: tournament tiles + matches list visually unchanged.

## Out of scope
- No DB migrations (all tables exist).
- No edge function changes — Phase E shadow stays on.
- No write paths (un-enroll, submit) on the dashboard.
- No tenant-event surface.
- No season toggle (lifetime-only per your call). Easy follow-up later.
- No backfill of `academy_synced` for historical rows.
