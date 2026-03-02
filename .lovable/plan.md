

# Enhance Player Comparison with Full Skills Radar

## Goal

Add Score Margin, Consistency, Experience, and per-genre dimensions to the Compare page so both players get a full side-by-side radar chart (matching the Skills Overview style from `PlayerStatsReport`).

## Changes

### 1. Create `src/hooks/useComparisonReport.ts`

A new hook that calls `useSkillInsights` for both player IDs and returns radar-compatible data for each. It will:

- Accept `playerAId` and `playerBId`
- Internally call `useSkillInsights(playerAId)` and `useSkillInsights(playerBId)`
- For each player, compute the same dimensions as `usePlayerReport`: Win Rate, Score Margin, Consistency, Experience, plus per-genre scores
- Merge both players' genre lists so the radar uses the **union** of all genres (missing genres default to 0)
- Return `{ radarData: { dimension, scoreA, scoreB, fullMark }[], isLoading }`

### 2. Create `src/components/compare/ComparisonRadarChart.tsx`

A new dual-overlay radar chart component (similar to existing `ComparisonChart` but with the enhanced dimensions):

- Uses Recharts `RadarChart` with two `Radar` layers (Player A in primary, Player B in destructive)
- Dimensions: Win Rate, Score Margin, Consistency, Experience, and all genre spokes
- Styled to match the existing cyberpunk aesthetic (same as `PlayerStatsReport`)
- Shows a legend with both player names
- Card title: "Skills Comparison"

### 3. Update `src/components/compare/ComparisonChart.tsx`

Replace the current basic 5-spoke radar (Points, Wins, Win Rate, Tournaments, Seasons) with the new enhanced chart. Two options:

- **Option chosen**: Replace the existing `ComparisonChart` contents to use data from the new `useComparisonReport` hook, keeping the same component name and import path so `PlayerComparison.tsx` needs minimal changes.
- Pass `playerAId` and `playerBId` as additional props (alongside existing `playerA`/`playerB` for display names)

### 4. Update `src/pages/PlayerComparison.tsx`

- Pass `playerAId` and `playerBId` to `ComparisonChart` so it can fetch skill insights
- Add new stat rows to the Career Stats card: Score Margin, Consistency, Experience (computed from the hook data)

## Technical Details

### Score Computation (per player)

Reuses the exact same logic from `usePlayerReport.ts`:

| Dimension | Formula |
|-----------|---------|
| Win Rate | `min(100, overallWinRate)` |
| Score Margin | Percentile rank of avg margin across player's games |
| Consistency | `max(0, 100 - stdDev(winRates) * 2)` |
| Experience | `min(100, totalMatches / 50 * 100)` |
| Genre (each) | `round(avgWinRate)` for that genre |

### Merged Dimensions

Both players' genres are unioned. If Player A plays "Fighting" but Player B does not, Player B scores 0 for "Fighting". This ensures both polygons share the same spoke set.

### Data Flow

```text
PlayerComparison.tsx
  |-- passes playerAId, playerBId to ComparisonChart
  |-- ComparisonChart internally calls useComparisonReport(playerAId, playerBId)
  |     |-- useSkillInsights(playerAId)
  |     |-- useSkillInsights(playerBId)
  |     |-- builds merged radar data
  |-- Renders dual-Radar chart
```

### No new dependencies

Uses existing `recharts` and `useSkillInsights`.

## File Summary

| Action | File |
|--------|------|
| Create | `src/hooks/useComparisonReport.ts` |
| Modify | `src/components/compare/ComparisonChart.tsx` (use enhanced dimensions) |
| Modify | `src/pages/PlayerComparison.tsx` (pass player IDs, add stat rows) |

