

## Assessment

### Current State
- **Tenant Codes** (`TenantCodes.tsx`): Only supports toggling `is_active` and deleting. No edit dialog exists. The `useTenantCodes` hook already has an `updateCode` mutation that accepts `is_active`, `description`, `campaign_id`, and `event_id` — but not `code`, `code_type`, `max_uses`, or `expires_at`.
- **Admin Bypass Codes** (`AdminBypassCodes.tsx`): Only supports toggling `is_active` and deleting. The `useBypassCodes` hook has no `updateCode` mutation at all — only `toggleActive`.

### What Needs to Change

#### 1. Hook: `useBypassCodes.ts` — Add `updateCode` mutation
Add a general `updateCode` mutation (replacing the limited `toggleActive`) that can update `description`, `max_uses`, `expires_at`, and `is_active`.

#### 2. Hook: `useTenantCodes.ts` — Expand `updateCode` fields
Extend the `updateCode` mutation's type to also accept `max_uses`, `expires_at`, `code_type`, and `description` (some already supported).

#### 3. UI: `AdminBypassCodes.tsx` — Add Edit dialog
Add a Pencil/Edit icon button per row that opens a dialog pre-populated with the code's current values (`description`, `max_uses`, `expires_at`). The `code` field itself stays read-only (changing codes after distribution would break existing usage). Save calls the new `updateCode` mutation.

#### 4. UI: `TenantCodes.tsx` — Add Edit dialog
Add a Pencil/Edit icon button per row (next to delete, hidden for read-only marketing users) that opens a dialog to edit `description`, `code_type`, `max_uses`, `expires_at`, `campaign_id`, and `event_id`. The `code` field stays read-only. Save calls the existing `updateCode` mutation.

### Editable Fields Summary

| Field | Tenant Codes | Bypass Codes |
|-------|-------------|--------------|
| code | Read-only | Read-only |
| description | Yes | Yes |
| code_type | Yes | N/A |
| max_uses | Yes | Yes |
| expires_at | Yes | Yes |
| campaign_id | Yes | N/A |
| event_id | Yes | N/A |
| is_active | Already works | Already works |

### Files Modified
1. `src/hooks/useBypassCodes.ts` — Add `updateCode` mutation
2. `src/hooks/useTenantCodes.ts` — Expand update type to include `max_uses`, `expires_at`
3. `src/pages/admin/AdminBypassCodes.tsx` — Add edit dialog
4. `src/pages/tenant/TenantCodes.tsx` — Add edit dialog

No database or RLS changes needed — the existing RLS policies already permit updates for admins and tenant admins.

