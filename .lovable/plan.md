

# Fix: Remove Duplicate Sidebar on Tenant Players Page

## Problem
`TenantRoute` already wraps all tenant pages in `TenantLayout` (which renders the sidebar). `TenantPlayers.tsx` **also** wraps its content in `TenantLayout`, resulting in two sidebars.

## Fix
Remove the `TenantLayout` wrapper from `TenantPlayers.tsx` — return just the page content `<div>` directly, same pattern the other tenant pages should follow.

## File Change
- `src/pages/tenant/TenantPlayers.tsx` — Remove the `TenantLayout` import and wrapper; keep the inner `<div className="space-y-6">` as the top-level return.

