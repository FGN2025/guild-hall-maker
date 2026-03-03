# Test Plan: Tenant / Multi-Org Features

Covers tenant management, team roles, events, subscribers, integrations, marketing assets, and zip code service areas.

---

## Prerequisites

1. Logged in as **Platform Admin** (for tenant creation).
2. A tenant admin account for tenant-specific tests.
3. At least one tenant with active status.

---

## Phase 1: Tenant Management (Platform Admin)

### Test 1.1 — Create a Tenant
1. Navigate to `/admin/tenants`.
2. Create a tenant with Name, Slug, Contact Email, and branding (colors, logo).
3. **Expected**: Tenant appears in the list with status `active`.

### Test 1.2 — Assign Tenant Admin
1. Add a user as tenant admin via `tenant_admins`.
2. **Expected**: User can now access `/tenant/*` routes for that tenant.

---

## Phase 2: Tenant Dashboard & Team

### Test 2.1 — Tenant Admin Access
1. Log in as tenant admin. Navigate to `/tenant/dashboard`.
2. **Expected**: Dashboard loads with tenant-specific data. Sidebar shows tenant navigation.

### Test 2.2 — Manage Team Members
1. Navigate to `/tenant/team`.
2. Add a new team member with role (admin/marketing).
3. **Expected**: New `tenant_admins` row created. Member appears in team list.

### Test 2.3 — Role-Based Access
1. As a `marketing` role member, try accessing admin-only settings.
2. **Expected**: Restricted access based on role checks (`is_tenant_admin` vs `is_tenant_member` vs `is_tenant_marketing_member`).

---

## Phase 3: Tenant Events

### Test 3.1 — Create an Event
1. Navigate to `/tenant/events`.
2. Create an event with Name, Game, Format, Start Date, Max Participants.
3. **Expected**: Event appears in the list. Default status = draft.

### Test 3.2 — Publish Event
1. Set `is_public = true` and `status = published`.
2. **Expected**: Event becomes visible on the public events page. Registration opens.

### Test 3.3 — Event Registration
1. As a player, register for a public tenant event.
2. **Expected**: `tenant_event_registrations` row created. Registration count updates.

### Test 3.4 — Event Assets
1. Upload banner/assets to the event.
2. **Expected**: `tenant_event_assets` rows created with correct `event_id` and `display_order`.

---

## Phase 4: Subscribers

### Test 4.1 — Upload Subscribers
1. Navigate to `/tenant/subscribers`.
2. Upload a CSV with subscriber data.
3. **Expected**: `tenant_subscribers` rows created with correct `tenant_id`, names, emails, account numbers.

### Test 4.2 — Subscriber Validation
1. Enable `require_subscriber_validation` on the tenant.
2. During user registration, verify email against subscriber list.
3. **Expected**: Only matching subscribers can register (via `validate-subscriber` edge function).

---

## Phase 5: Integrations & Sync

### Test 5.1 — Configure Integration
1. Navigate to `/tenant/settings`.
2. Add an integration (GLDS, NISC, etc.) with API URL and key.
3. **Expected**: `tenant_integrations` row created with `provider_type` and encrypted API key.

### Test 5.2 — Trigger Sync
1. Trigger a sync for the configured integration.
2. **Expected**: `tenant_sync_logs` row created with status, records_synced count, and message.

### Test 5.3 — Sync History
1. View sync history panel.
2. **Expected**: All sync logs displayed with timestamps, status badges, and record counts.

---

## Phase 6: Zip Code Service Areas

### Test 6.1 — Add Zip Codes
1. Navigate to `/tenant/zip-codes`.
2. Add zip codes to the tenant's service area.
3. **Expected**: `tenant_zip_codes` rows created. City/state auto-populated from `national_zip_codes` if available.

### Test 6.2 — Zip Lookup
1. Call `lookup_providers_by_zip('12345')`.
2. **Expected**: Returns all active tenants that serve that zip code.

---

## Phase 7: Marketing Assets

### Test 7.1 — Access Marketing Campaigns
1. Navigate to `/tenant/marketing`.
2. **Expected**: Published campaigns visible to tenant marketing members.

### Test 7.2 — Download/Copy Assets
1. View assets for a published campaign.
2. **Expected**: Assets load from storage. Download/copy functionality works.

---

## Phase 8: RLS Verification

| Table | Policy Check |
|---|---|
| `tenant_admins` | Only own tenant admins + platform admins can manage |
| `tenant_events` | Tenant members can manage; public events visible to all |
| `tenant_event_registrations` | Users can register; tenant members can view all |
| `tenant_subscribers` | Tenant members only |
| `tenant_integrations` | Tenant members only |
| `tenant_marketing_assets` | Marketing role + admin |

---

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| **Tenant with no subscribers** | Empty state in subscriber list |
| **Deactivated tenant** | Tenant pages show appropriate state; public events hidden |
| **User is admin of multiple tenants** | Can switch between tenants |
| **Zip code not in national_zip_codes** | Still accepted; city/state remain null |
| **Integration sync failure** | Sync log shows `error` status with message |
