

# Fix Tenant Admin Assignment Panel

## Problem

The TenantAdminPanel side sheet has the add functionality but it may be failing because:
1. The profile search uses `.or()` with a single ilike filter, which could behave unexpectedly
2. There's no visual feedback during search (just a disabled state on the button)
3. The search-then-add flow is fragile -- if the profile search finds someone unexpected, it adds the wrong person
4. The `or()` filter syntax wrapping a single condition is non-standard and may cause issues with certain Supabase SDK versions

## Plan

### Improve the `TenantAdminPanel` in `AdminTenants.tsx`:

1. **Fix the profile search** -- Replace `.or('display_name.ilike.%...')` with `.ilike('display_name', '%...')` which is the correct single-filter syntax
2. **Add a two-step flow** -- Show search results first so the admin can confirm which user to add, instead of blindly adding the first match
3. **Better loading/error UX** -- Show a spinner during search, clearer error messages, and confirmation of who is being added
4. **Show matched user before adding** -- Display the found user's display name with a confirm button so admins don't accidentally add the wrong person

### File: `src/pages/admin/AdminTenants.tsx` (TenantAdminPanel component only)

- Replace `.or(...)` with `.ilike('display_name', ...)` for correct filtering
- Add a `foundUser` state to show the matched profile before confirming the add
- Add "Cancel" option to clear the found user
- Show spinner during search

