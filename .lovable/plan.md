

## Expand Manager Role: Subscriber, ZIP, and Integration Access

### Current State
The `TenantSidebar.tsx` restricts these items to `admin` only:
- ZIP Codes → `roles: ['admin']`
- Subscribers → `roles: ['admin']`
- Integrations → `roles: ['admin']`
- Settings → `roles: ['admin']`

Managers cannot see or navigate to these pages. The RLS policies already use `is_tenant_member()` (which includes managers) for `tenant_subscribers`, `tenant_integrations`, `tenant_sync_logs`, and `tenant_zip_codes` — so **no database changes are needed**.

### Changes

**`src/components/tenant/TenantSidebar.tsx`** — Add `'manager'` to the roles array for:
- ZIP Codes
- Subscribers
- Integrations
- Settings

**`src/pages/tenant/TenantGuide.tsx`** — Update the guide to reflect that Managers now have access to these features.

### Files Changed

| File | Change |
|------|--------|
| `src/components/tenant/TenantSidebar.tsx` | Add `'manager'` to 4 sidebar items' roles arrays |
| `src/pages/tenant/TenantGuide.tsx` | Update Roles section to reflect expanded Manager permissions |

No database migrations required — existing RLS policies already grant access via `is_tenant_member()`.

