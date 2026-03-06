

# Improve Inactive Tenant Visibility on Admin Tenants Page

## Finding

PVT **is still in the database** with status "inactive" and **is still in the list** — it was not deleted. The query fetches all tenants regardless of status. However, with 69 tenants sorted by creation date, inactive ones like PVT get buried. The card shows a small "inactive" badge but otherwise looks identical to active ones, making them easy to miss.

## Changes

### `src/pages/admin/AdminTenants.tsx`

1. **Add a search bar and status filter** at the top of the tenant list:
   - Text search input filtering by name/slug
   - Status filter tabs or dropdown: "All", "Active", "Inactive" — defaulting to "All"
   - Show count for each status (e.g., "Active (67) · Inactive (2)")

2. **Visually differentiate inactive tenant cards**:
   - Add reduced opacity (`opacity-60`) to the entire card when status is "inactive"
   - Change the card border to a muted/dashed style
   - The "inactive" badge already exists; keep it

3. **Sort inactive tenants to the bottom** within each status group (active first, then inactive), preserving creation-date order within each group

These are purely UI changes — no database or hook modifications needed. The `useTenants` hook already returns all tenants with their status.

