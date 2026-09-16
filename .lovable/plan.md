# Fix Tournament Oversight filters + add Archive

## What's wrong today

The filter dropdown only matches the stored status label, never the date. In the live data every tournament labelled "upcoming" (80 of them) actually started in the past, so picking "upcoming" shows a wall of finished events. There is also no way to look at past events on purpose.

## What you'll get

A cleaner two-part filter bar on Tournament Oversight:

1. **Timeframe** (new): All time / Upcoming / Happening now / Archive (past)
   - Upcoming = starts in the future and not cancelled/completed
   - Happening now = started but not yet ended
   - Archive = already ended, or marked completed/cancelled
2. **Status** (existing dropdown, kept): all / open / upcoming / in progress / completed / cancelled

The two work together, and the search box filters by tournament name and game within the current selection. Default view becomes Upcoming, with the count of matching tournaments shown next to the filters so it's obvious when a filter hides things.

Because the date is what decides the timeframe, stale "upcoming" labels no longer pollute the upcoming view — those events land in Archive where they belong.

## Data left alone

No tournament records are changed. The 80 mislabelled rows keep their stored status; only what you see is corrected. If you'd also like a one-time cleanup that flips genuinely finished events to "completed", say so and I'll add it as a separate step.

## Technical notes

- `src/pages/admin/AdminTournaments.tsx`: add a `timeframe` state and extend the `filtered` useMemo to evaluate `start_date` / `end_date` against `now` alongside `statusFilter` and `search`.
- Treat a missing `end_date` as same-day as `start_date` for the "happening now" window.
- Search stays case-insensitive over `name` and `game`; fix the current bug where an empty status match combined with search short-circuits the return.
- Verify all filter/search/view-mode combinations render the expected counts in both grid and list views.
