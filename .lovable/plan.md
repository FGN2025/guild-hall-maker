

## Tenant Admin Player & Subscriber Management — Edit, Delete, Ban

### Current State

- **Players page** (`/tenant/players`): Read-only table showing legacy + new players with search, CSV/PDF export. No row-level actions.
- **Subscribers page** (`/tenant/subscribers`): Read-only table with search, pagination, CSV/PDF export. The hook has `deleteSubscriber` but it's not wired to the UI. No edit capability.
- Players come from two sources: `user_service_interests` (new leads) and `legacy_users` (legacy). Subscribers come from `tenant_subscribers`.
- Platform-level user deletion/ban exists via the `delete-user` edge function, but only for platform admins.

### Proposed Capabilities

#### 1. Subscriber Management (Edit, Delete)

**Edit Subscriber Dialog** — Inline edit dialog for `tenant_subscribers` records:
- Editable fields: first_name, last_name, email, phone, address, zip_code, account_number, plan_name, service_status
- Uses an `updateSubscriber` mutation (new) in `useTenantSubscribers`
- Pencil icon per row opens the dialog

**Delete Subscriber** — Trash icon per row with confirmation dialog:
- Wire existing `deleteSubscriber` mutation to UI
- Restricted to Tenant Admin role (not Manager)

#### 2. Player Management (Edit, Delete, Ban)

Players are more complex since they map to auth users (new leads) or legacy records.

**Edit Legacy Player** — Dialog to edit `legacy_users` fields:
- Editable: legacy_username, email, first_name, last_name, address, zip_code, invite_code, status
- New `updateLegacyPlayer` mutation in `useTenantPlayers`

**Edit New Lead** — Limited edit on `user_service_interests` (status, zip_code). Display name changes would require profile access, which is player-owned.

**Delete Player**:
- Legacy: Delete from `legacy_users` table directly
- New leads: Delete from `user_service_interests` (removes the lead record, does NOT delete the auth user — that's platform admin territory)

**Ban Player** (new leads only):
- Tenant admins can flag a player for ban by calling a new edge function `tenant-ban-player` that:
  - Verifies the caller is a tenant admin for the player's tenant
  - Inserts into `banned_users` table
  - Optionally removes the `user_service_interests` record
- This does NOT delete the auth user (that stays platform admin only) but prevents re-registration

#### 3. UI Changes

**Files to modify/create:**

| File | Change |
|---|---|
| `src/components/tenant/EditSubscriberDialog.tsx` | New — form dialog for editing subscriber fields |
| `src/components/tenant/EditPlayerDialog.tsx` | New — form dialog for editing legacy/lead player fields |
| `src/hooks/useTenantSubscribers.ts` | Add `updateSubscriber` mutation |
| `src/hooks/useTenantPlayers.ts` | Add `updateLegacyPlayer`, `deleteLegacyPlayer`, `deleteLead` mutations |
| `src/pages/tenant/TenantSubscribers.tsx` | Add edit/delete action buttons per row |
| `src/pages/tenant/TenantPlayers.tsx` | Add edit/delete/ban action buttons per row |
| `supabase/functions/tenant-ban-player/index.ts` | New edge function — tenant-scoped ban |
| New migration | RLS policies allowing tenant admins to UPDATE/DELETE on `legacy_users` and `tenant_subscribers` scoped to their tenant |

#### 4. Access Control

- Only **Tenant Admin** role can edit/delete/ban — Managers get read-only view (existing pattern from subscribers page)
- RLS ensures tenant admins can only modify records belonging to their own tenant
- Ban action requires confirmation dialog with explicit "Ban" label

#### 5. Database Migration

```sql
-- Ensure tenant admins can update/delete legacy_users for their tenant
-- (Check existing RLS first — may need new policies)

-- Ensure tenant admins can update tenant_subscribers for their tenant
-- (deleteSubscriber mutation exists but RLS may need UPDATE policy)
```

### Implementation Order

1. Database migration — add UPDATE/DELETE RLS policies for tenant-scoped access
2. `useTenantSubscribers` — add `updateSubscriber` mutation
3. `EditSubscriberDialog` component + wire into Subscribers page
4. Wire delete button into Subscribers page
5. `useTenantPlayers` — add update/delete mutations
6. `EditPlayerDialog` component + wire into Players page
7. `tenant-ban-player` edge function
8. Wire ban button into Players page (new leads only)

