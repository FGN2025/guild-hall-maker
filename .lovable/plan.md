## Goal

Show real point values as the prize on tournament cards/detail (since the point-pool field was removed), and rework Game Night participation awarding into two colored checkmarks per player.

## 1. Prize display driven by placement points

`src/components/tournaments/PrizeDisplay.tsx` — add a points-based mode:
- New props: `format`, `pointsParticipationLong`, `pointsParticipationShort`.
- Physical prize still wins (shows the item name).
- Game Night: prize value = long participation points, e.g. `10 pts`.
- All other formats: prize value = `pointsFirst + pointsSecond + pointsThird` (defaults 15/9/6 → `30 pts`).
- If all point fields are 0 and no physical prize, keep showing "No Prize" / "—".

`src/components/tournaments/TournamentCard.tsx` — pass the format and all point fields into `PrizeDisplay` (the query already selects `*`).

## 2. Tournament detail page

`src/pages/TournamentDetail.tsx` — pass the same new props. In the "Prize Pool" block:
- Non-Game-Night: keep the 1st/2nd/3rd breakdown but source it from the explicit `points_first/second/third` columns instead of the old percentage math.
- Game Night: replace the 1st/2nd/3rd breakdown with two tiles — "Long Session — {points_participation_long} pts" and "Short Session — {points_participation_short} pts".

## 3. Manage page — Game Night awarding

`src/pages/TournamentManage.tsx` (Game Night branch only; non-Game-Night UI unchanged):
- Replace the "Mark Long / Mark Short / Clear tier / Select all" bulk bar with a static legend: a cyan swatch "Long = {points_participation_long} pts" and a purple swatch "Short = {points_participation_short} pts".
- Remove the select-checkbox to the left of each player name (row shows index number like other formats).
- Add two checkboxes on the right of each row: purple = Short, cyan = Long.
  - Clicking one sets that player's participation tier and awards those points in a single action.
  - The two are mutually exclusive: checking one when the other is set revokes the previous participation award and applies the new one.
  - Unchecking revokes the participation award and clears the tier.
- Keep the "+N pts" awarded indicator; keep the placement dropdown hidden for Game Nights as it is today.
- Update the footer helper text to describe the new two-checkbox flow.

## Technical notes

- No database or edge-function changes. Awarding still calls `awardPlayer` with `participation_long` / `participation_short` and `revokeAward` with `scope: "participation"`; tier setting still uses the existing `setParticipationTier` mutation, now driven per-row instead of by bulk selection.
- Purple/cyan use existing semantic tokens (`accent` for purple, `primary` for cyan) — no hardcoded color utilities.
- Older tournaments with a legacy `prize_type = 'value'` pool keep rendering that value as a fallback when explicit points are all zero.
