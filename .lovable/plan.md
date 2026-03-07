

# Sortable Tenant List with Sort Dropdown

## Current State
The tenant list currently sorts active tenants first, inactive last -- no other sorting. There's a search bar and status filter tabs already in the toolbar area.

## Plan

### Add sort state and dropdown to `AdminTenants.tsx`

**New state:** `sortField` (default: `"name"`) and `sortDirection` (default: `"asc"`).

**Sort options:**
- Name (A-Z / Z-A)
- Created Date (Newest / Oldest)  
- Status (Active first / Inactive first)

**UI:** Add a `Select` dropdown next to the existing search bar and status filter tabs. The dropdown shows the current sort choice. Active-first grouping becomes one of the sort options rather than always-on.

**Sort logic:** Replace the current `.sort()` on `filteredTenants` with a dynamic comparator based on `sortField` + `sortDirection`:

```text
┌─────────────────────────────────────────────────────┐
│ [🔍 Search...]  [All | Active | Inactive]  [Sort ▾] │
│                                          Name A-Z   │
│                                          Name Z-A   │
│                                          Newest     │
│                                          Oldest     │
│                                          Status     │
└─────────────────────────────────────────────────────┘
```

### File changes

| File | Change |
|---|---|
| `src/pages/admin/AdminTenants.tsx` | Add `sortField`/`sortDirection` state, a `Select` dropdown in the filter bar, replace the `.sort()` comparator |

Single file edit, no database changes needed.

