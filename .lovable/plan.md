

# Skills Overview Radar Chart + Player Stats Report

## Goal

Replace the planned grid-based heat map with a **radar/spider chart** matching the reference image style -- a polygon chart with labeled skill dimensions around the perimeter and concentric guide rings showing score levels (0, 25, 50, 75, 100).

## What It Looks Like

A "Skills Overview" card displaying a Recharts `RadarChart` with:
- Skill dimensions as spokes: **Win Rate**, **Score Margin**, **Consistency**, **Experience**, and one spoke per genre the player competes in
- A filled polygon showing the player's percentile scores (0-100)
- Concentric grid rings at 25, 50, 75, 100
- Dark card background matching the cyberpunk aesthetic (semi-transparent fill, cyan/primary stroke)

Below the radar chart, the existing game-by-game insight cards and genre badges remain.

## Changes

### 1. Create `src/hooks/usePlayerReport.ts`

Computes percentile-based scores (0-100) for the player across dimensions:

| Dimension | Calculation |
|-----------|------------|
| Win Rate | Percentile rank of player's overall win rate vs. all players |
| Score Margin | Percentile rank of average score margin vs. all players |
| Consistency | Inverse percentile of score margin standard deviation (lower variance = higher score) |
| Experience | `min(100, playerTotalMatches / maxPlayerMatches * 100)` |
| Per-Genre scores | Average win rate percentile across games in that genre |

Returns an array of `{ dimension: string, score: number, fullMark: 100 }` for direct use in Recharts RadarChart.

### 2. Create `src/components/stats/PlayerStatsReport.tsx`

The main report component containing:

- **"Skills Overview" header** matching the reference image style
- **Recharts `RadarChart`** with `PolarGrid`, `PolarAngleAxis` (dimension labels around the outside), `PolarRadiusAxis` (concentric rings), and a single `Radar` area with:
  - `stroke="hsl(var(--primary))"` (cyan in dark mode)
  - `fill="hsl(var(--primary))"` with low opacity (0.2-0.3)
  - `dot` markers on each vertex
- **Overall Player Rating** -- a single weighted average score displayed prominently
- **Strengths and Weaknesses** -- auto-generated list from highest/lowest scoring dimensions
- **Improvement Tips** -- contextual advice for the weakest 2-3 dimensions

The chart uses the existing `recharts` dependency (already installed) -- specifically `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` from `recharts`.

### 3. Update `src/components/stats/MyStatsView.tsx`

- Import and render `PlayerStatsReport` between the summary stat cards and the "Performance by Game" bar chart
- The radar chart is always visible (not collapsed), as it serves as the primary visual summary
- It sits in its own card with the "Skills Overview" heading

## Technical Details

### Data source

Reuses the same data already fetched by `useSkillInsights` -- the `usePlayerReport` hook will call `useSkillInsights` internally and transform its output into radar-compatible dimensions. No additional database queries needed.

### Percentile calculation

```
percentileRank(value, sortedArray) = 
  (count of values <= playerValue) / totalCount * 100
```

### Consistency score

Standard deviation of all the player's score margins across all games. Lower std dev = more consistent = higher score. Computed as:

```
consistencyScore = (1 - percentileRank(playerStdDev, allStdDevs)) * 100
```

### Radar data shape

```typescript
[
  { dimension: "Win Rate", score: 72, fullMark: 100 },
  { dimension: "Score Margin", score: 58, fullMark: 100 },
  { dimension: "Consistency", score: 85, fullMark: 100 },
  { dimension: "Experience", score: 45, fullMark: 100 },
  { dimension: "Fighting", score: 80, fullMark: 100 },  // genre
  { dimension: "Shooters", score: 35, fullMark: 100 },  // genre
]
```

### Styling

- Card: `rounded-xl border border-border bg-card p-6`
- Radar fill: `hsl(var(--primary))` at 20% opacity
- Radar stroke: `hsl(var(--primary))` solid
- Grid lines: `hsl(var(--border))` or `hsl(var(--muted-foreground))` at reduced opacity
- Axis labels: `fill="hsl(var(--muted-foreground))"` with small font size
- Matches the dark cyberpunk aesthetic of the platform

### No new dependencies

Uses `recharts` (already installed). No external radar or chart library needed.

## File Summary

| Action | File |
|--------|------|
| Create | `src/hooks/usePlayerReport.ts` |
| Create | `src/components/stats/PlayerStatsReport.tsx` |
| Modify | `src/components/stats/MyStatsView.tsx` (add radar chart section) |
