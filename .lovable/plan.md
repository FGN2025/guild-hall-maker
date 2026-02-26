

## Tournament Filtering & Sorting Improvements

### Overview
Three changes to how tournaments are filtered and displayed on the Tournaments page.

### Changes (all in `src/pages/Tournaments.tsx`)

#### 1. Default filter set to "Open" instead of "All Statuses"
- Change `useState("all")` to `useState("open")` for `statusFilter`

#### 2. Rename "Upcoming" filter to "Registered"
- Replace the `<SelectItem value="upcoming">Upcoming</SelectItem>` with `<SelectItem value="registered">Registered</SelectItem>`
- Update the filter logic: when `statusFilter === "registered"`, show tournaments where `t.is_registered === true` (regardless of status)

#### 3. Show registered tournaments in the "Open" view
- When `statusFilter === "open"`, show tournaments that are status `"open"` OR where the user is registered (`t.is_registered === true`)

### Technical Details

**File to modify:** `src/pages/Tournaments.tsx`

The filter logic in the `useMemo` block (lines 26-35) will be updated:

```text
Current:  matchesStatus = statusFilter === "all" || t.status === statusFilter
Updated:
  - "all"        -> true (no status filter)
  - "open"       -> t.status === "open" || t.is_registered
  - "registered" -> t.is_registered
  - other values -> t.status === statusFilter
```

No database changes or new dependencies required.
