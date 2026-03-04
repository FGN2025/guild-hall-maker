

# Tenant Player Directory -- Plan

## Current State

Tenants currently have two separate, incomplete views:
- **Leads** (`user_service_interests`): New users who selected this tenant during registration. Shows display name, gamer tag, ZIP, and status.
- **Subscribers** (`tenant_subscribers`): Billing records (name, account number, email). These are not platform user accounts.

**Missing**: There is no way for a tenant to see legacy users (`legacy_users` table has a `tenant_id` column) or to view a unified directory of all players (legacy + new) associated with their tenant.

## What to Build

A new **"Players"** page in the tenant portal that combines:

1. **New players** -- Queried from `user_service_interests` joined with `profiles` for users who registered under this tenant.
2. **Legacy players** -- Queried from `legacy_users` where `tenant_id` matches the current tenant.

Both sets displayed in a single searchable, filterable table with a badge indicating source ("New" vs "Legacy") and match status for legacy users.

## Implementation

### 1. Database: RLS policy for tenant access to legacy users

Add a SELECT policy on `legacy_users` so tenant members can view records belonging to their tenant:

```sql
CREATE POLICY "Tenant members can view own legacy users"
  ON public.legacy_users FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id, auth.uid()));
```

### 2. New hook: `src/hooks/useTenantPlayers.ts`

- Fetches from `user_service_interests` (joined with `profiles`) for new players
- Fetches from `legacy_users` filtered by `tenant_id` for legacy players
- Merges both into a unified list with a `source` field ("new" | "legacy")
- Returns search/filter capabilities

### 3. New page: `src/pages/tenant/TenantPlayers.tsx`

- Stats cards: Total players, New players, Legacy players, Matched (legacy users with `matched_user_id`)
- Search bar filtering by name, email, gamer tag, ZIP
- Table columns: Name, Gamer Tag / Username, Email, ZIP, Source (badge), Status, Registered date
- Legacy rows show `legacy_username` and whether they have been matched to a new account

### 4. Sidebar + routing

- Add "Players" link to `TenantSidebar.tsx` (visible to admin and manager roles)
- Add route `/tenant/players` in `App.tsx`

## File Changes

| File | Action |
|---|---|
| Migration SQL | Add RLS policy on `legacy_users` for tenant members |
| `src/hooks/useTenantPlayers.ts` | Create -- unified query hook |
| `src/pages/tenant/TenantPlayers.tsx` | Create -- player directory page |
| `src/components/tenant/TenantSidebar.tsx` | Add "Players" nav item |
| `src/App.tsx` | Add `/tenant/players` route |

