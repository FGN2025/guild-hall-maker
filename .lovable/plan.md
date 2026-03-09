

## Plan: Update Tenant Players Table Columns

### Changes

**`src/hooks/useTenantPlayers.ts`**
- Add `inviteCode: string | null` to `UnifiedPlayer` interface
- Add `invite_code` to the legacy_users select query
- Map `row.invite_code` to `inviteCode` in the legacy player mapping
- Set `inviteCode: null` for new leads (no equivalent field)
- Add `inviteCode` to the search filter

**`src/pages/tenant/TenantPlayers.tsx`**
- Remove the **ZIP** and **Source** columns from the table
- Add an **Invite Code** column displaying `p.inviteCode || "—"`
- Keep the "Extract ZIPs from Addresses" button as-is
- Update `colSpan` from 7 to 6 (Name, Gamer Tag, Email, Invite Code, Status, Registered)
- Update search placeholder to remove "ZIP" reference

No database changes needed — `invite_code` already exists on `legacy_users`.

