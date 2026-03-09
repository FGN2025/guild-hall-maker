

## Current State

Tenant Codes are currently **hidden inside the Marketing page** as a sub-tab (`/tenant/marketing` → "Codes" tab). There is no dedicated sidebar link for Codes, making it hard to discover.

The Admin Tenants page (`/admin/tenants`) shows a "0 Codes" badge per tenant but clicking it doesn't navigate anywhere.

## Plan

### 1. Add "Codes" to the Tenant Sidebar
Add a new sidebar item `{ to: "/tenant/codes", label: "Codes", icon: KeyRound, roles: ['admin'] }` in `TenantSidebar.tsx`, positioned after "Team" (since it's admin-only). This gives Platform Admins and Tenant Admins direct access.

### 2. Add `/tenant/codes` Route
Ensure `App.tsx` has a dedicated route for `/tenant/codes` rendering `TenantCodes` (the lazy import already exists). Wrap it in the `TenantRoute` protected layout.

### 3. Make "X Codes" Badge on Admin Tenants Clickable
On the Admin Tenants page, make the "X Codes" badge a button that navigates to the tenant portal codes page (setting the selected tenant first via `localStorage`, then navigating to `/tenant/codes`).

### 4. Keep Marketing Tab
The embedded codes tab inside Marketing will remain as-is for convenience — users can access codes from either location.

### Technical Details
- **TenantSidebar.tsx** (line ~49): Insert new sidebar item with `KeyRound` icon, roles `['admin']`
- **App.tsx**: Add `<Route path="codes" element={<TenantCodes />} />` inside the tenant route group
- **AdminTenants.tsx**: Wire the codes badge to navigate with tenant context

