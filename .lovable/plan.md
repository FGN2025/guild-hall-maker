

## Problem
The admin tenants page (`/admin/tenants`) is showing a white/blank content area in the development preview. The sidebar renders correctly, but the page content is empty with no visible console errors.

## Root Cause Analysis
After reviewing the code thoroughly, there are no obvious crash-inducing bugs. The most likely causes are:

1. **Transient auth/query state** — The `useTenants` query may be silently failing due to an RLS or auth issue, causing `tenants` to remain `[]` and the page to show an empty state that blends with the background.
2. **Missing `require_subscriber_validation` on Tenant interface** — While not a crash risk, this is a type gap that should be fixed.
3. **Silent query errors** — The `tenants` query throws on error but the error is caught by React Query and not displayed to the user.

## Plan

### Step 1: Add error handling to the tenants page
Add an error state display to `AdminTenants` so if the `useTenants` query fails (e.g., RLS denial, network issue), the user sees an error message instead of a blank screen.

**File: `src/hooks/useTenants.ts`**
- Add `require_subscriber_validation` to the `Tenant` interface
- Export the `Tenant` type
- Return `error` from the `useTenants` hook

**File: `src/pages/admin/AdminTenants.tsx`**
- Destructure `error` from `useTenants()` (currently not exposed)
- Add an error display state between the loading and empty states:
  ```
  if (error) → show "Failed to load tenants" with the error message and a retry button
  ```

### Step 2: Add defensive null checks in TenantCard filter
Add optional chaining for `t.name?.toLowerCase()` and `t.slug?.toLowerCase()` in the filter/sort logic to prevent crashes if a tenant has unexpected null values.

**Files to edit:**
- `src/hooks/useTenants.ts` (interface fix + expose error)
- `src/pages/admin/AdminTenants.tsx` (error display + defensive null checks)

