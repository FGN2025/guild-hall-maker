

## Fix: Stats bar should reflect the active game filter

### Problem
The filtered challenge link works correctly — only ATS challenges are displayed and the filter tab is highlighted. However, the stats bar at the top still shows totals for **all** challenges (e.g. "67 Available"), which makes it look like nothing is filtered.

### Fix

**`src/pages/Challenges.tsx`**
- Update the four stat cards (Available, Enrolled, Completed, Progress) to use `filtered` challenges instead of the unfiltered `challenges` array
- Update the progress bar to also use `filtered` counts
- This way, when a user lands on `/challenges?game=American+Truck+Simulator`, the stats reflect only ATS challenges (e.g. "6 Available" instead of "67")

### Scope
One file, ~6 line changes. No database changes.

