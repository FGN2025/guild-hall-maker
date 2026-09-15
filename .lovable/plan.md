# Challenges: Game Hub + Per-Game Community Pages

Turn the flat, filter-chip challenge list into a two-level experience: a hub of game "communities," and a dedicated page per game with its own hero, artwork, colors, badge progress, and challenge lineup — matching the attached vision.

## Level 1 — Challenges hub (`/challenges`)

A grid of large game tiles instead of a wall of mixed cards.

- Each tile: wide hero art, game name, category tag, challenge count, your progress ("2 of 17 done"), and a merit badge chip when the game feeds a pathway (Flight, Transportation, Construction Trades, Safety).
- Grouped by category (Simulation, Trades, etc.) with a search box.
- Keeps the stats strip and points wallet for signed-in players; guests see the sign-in prompt and can browse everything read-only.
- A "Show all challenges" link preserves today's combined list for people who prefer it.
- Old `?game=Name` links redirect to that game's new page, so existing links and shared URLs keep working.

## Level 2 — Game community page (`/challenges/game/:slug`)

Mirrors the attached mockup:

- Back link, full-width hero banner with the game's generated artwork, logo-style title, tagline, and category/platform chips.
- Right-hand badge panel: the game's merit/badge identity, "X / Y challenges completed" progress bar, tier markers, and a next-reward card. When the game maps to a merit pathway, the panel shows real pathway progress and links to the merit detail page; otherwise it shows plain game progress with tier markers.
- Difficulty filter pills: All / Beginner / Intermediate / Advanced.
- Challenge card grid styled with the game's accent color, showing tasks completed, duration, enrolled count, points, and a "View Challenge" action.
- A completed section below for finished challenges.
- Per-game page title and description for search engines.

## Game identity artwork

I will generate a wide hero banner plus an accent color for each game that currently has challenges (American Truck Simulator, Microsoft Flight Simulator 2024, House Flipper, House Flipper 2, Construction Simulator, Farm Simulator 2025, Data Center, Roadcraft, The Farmer Was Replaced, and the remaining active titles). Banners are hosted as app assets and mapped to the game slug, so staff can swap them later. Accent colors come from the FGN palette with pillar locks respected (Flight/Play = cyan, Trades = violet, Path = amber, Fiber = azure).

## Tenant pages

The same hub and game-page components get a tenant mode: tenant-branded colors and logo replace FGN accents, and the game list is limited to challenges the tenant has scheduled. Tenant staff scheduling screens are unchanged.

## Technical notes

- New: `src/pages/ChallengesHub.tsx`, `src/pages/GameChallenges.tsx`, `src/components/challenges/GameTile.tsx`, `GameChallengeHero.tsx`, `GameBadgePanel.tsx`, `DifficultyFilter.tsx`, and `src/lib/gameIdentity.ts` (slug → banner asset, accent token, tagline).
- Routes added in `src/App.tsx`; `/challenges?game=` redirects to `/challenges/game/:slug`.
- Data comes from existing queries (`challenges` + `games`, `challenge_enrollments`, `useMyChallengeWindows`) plus `useMeritPathways` for the badge panel; a small extra hook maps `merit_challenges` rows to game slugs.
- Accent colors added as semantic tokens in `index.css` and applied via CSS variables per game — no hardcoded color classes.
- No database migration is required; if staff-editable banners/accents are wanted later, that would add three columns to `games` in a follow-up.
- No changes to marketing, dispatch, the September queue, or the kill switch.
