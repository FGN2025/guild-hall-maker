

## Problem

The Tenant Dashboard (`/tenant`) only shows **Leads** and **ZIP Codes** stats. It does not surface any player/legacy user counts. While the **Players** page exists at `/tenant/players` (visible in the sidebar), the Dashboard gives no indication that players exist for this tenant.

Bristol Tennessee has **144 legacy players** in the database, but the Dashboard shows zero activity because it only queries leads (`user_service_interests`), not legacy users.

## Plan

### 1. Add Player Stats to the Tenant Dashboard

Update `src/pages/tenant/TenantDashboard.tsx` to:
- Query `legacy_users` count for the tenant
- Query `user_service_interests` (new players) count for the tenant
- Add a "Total Players" and "Legacy Players" stat card to the dashboard grid
- Add a "Recent Players" section or a quick-link card to `/tenant/players`

### 2. Update Dashboard Stats Grid

Replace the current 4-stat layout with a more comprehensive view:

| Stat | Source |
|------|--------|
| Total Players | legacy_users + user_service_interests count |
| Legacy Players | legacy_users count for tenant |
| Total Leads | user_service_interests (existing) |
| ZIP Codes Covered | tenant_zip_codes (existing) |

### 3. Add Quick Navigation Card

Add a "View All Players" link card below the stats that navigates to `/tenant/players`, making the Players page more discoverable.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/tenant/TenantDashboard.tsx` | Add legacy player count query, update stats grid, add player quick-link |

