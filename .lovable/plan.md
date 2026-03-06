

# Activate Tenant Codes Across All Workflows

## Assessment

The codes infrastructure is **built but partially connected**. Here is the gap analysis:

| Workflow | Status | Gap |
|---|---|---|
| Tenant creates/manages codes | Done | Working at `/tenant/codes` |
| Marketing views codes (read-only) | Done | Sidebar link + `isReadOnly` gate |
| Codes linked to marketing campaigns | Done | `CampaignCodeLinker` in `TenantMarketingDetail` |
| Admin sees code counts per tenant | Done | Badge on `AdminTenants` cards |
| Admin sees campaign-linked codes | Done | `AdminCampaignCodes` in admin marketing |
| Codes attached to tenant events | **Missing** | Events form has no code selector |
| Codes used during registration | **Missing** | `ZipCheckStep` only uses platform `bypass_codes`, not tenant codes |
| Validation hook consumed in UI | **Missing** | `useValidateTenantCode` hook exists but is never imported |
| Tenant code for "requires further review" | **Missing** | No `code_type` for subscriber verification gating |

## Plan

### 1. Add Code Picker to Tenant Events Form (`TenantEvents.tsx`)

- Add `event_id` column to `tenant_codes` table (nullable FK) — mirrors `campaign_id` pattern
- In the event create/edit dialog, add a section after "Social Copy" that lets the tenant:
  - Link an existing code to the event
  - Create a new code scoped to the event
- Reuse the `CampaignCodeLinker` pattern but generalize it into an `EntityCodeLinker` component that accepts either a `campaignId` or `eventId`
- Show linked codes on the event card

**Database migration:**
```sql
ALTER TABLE tenant_codes ADD COLUMN event_id uuid REFERENCES tenant_events(id) ON DELETE SET NULL;
```

### 2. Integrate Tenant Codes into Registration Flow (`ZipCheckStep.tsx`)

Currently, when a user has a valid ZIP and a provider is found, they proceed directly. The new flow:

- After provider selection, if the user enters an invite code, check it against **both** `validate_bypass_code` (platform) **and** `validate-tenant-code` (tenant, dry-run) 
- If a tenant code of type `override` is found, mark the registration as "pending tenant review" (store the code_id in a new column on `user_service_interests`)
- If a tenant code of type `access` is found, grant immediate access (same as bypass)
- If a tenant code of type `campaign` or `tracking` is found, record it for attribution but do not change access

This connects the `useValidateTenantCode` hook into the actual registration path.

**Changes:**
- `ZipCheckStep.tsx`: After ZIP validation succeeds, also accept tenant codes in the invite code field by calling `validate-tenant-code` with `dry_run: true` when `validate_bypass_code` returns false
- `useRegistrationZipCheck.ts`: Add a fallback path that tries tenant code validation
- `Auth.tsx`: Pass the validated `code_id` and `code_type` through to the signup metadata for downstream processing

### 3. Generalize `CampaignCodeLinker` → `EntityCodeLinker`

Refactor the existing component to accept a generic `entityType` ("campaign" | "event") and `entityId`, so it can be reused in both the marketing detail page and the event form without duplicating code.

- Rename `CampaignCodeLinker.tsx` → keep it but wrap an `EntityCodeLinker` 
- Or simply add an `eventId` prop alongside `campaignId` (simpler, less churn)
- Update the query in `useTenantCodes` to also filter by `event_id` when needed

### 4. Add "verification" Code Type

Extend `CODE_TYPES` to include `"verification"` for the subscriber-review workflow:
- When a tenant creates a `verification` code, it signals that users entering it during registration require manual subscriber verification before full access
- The code is validated, usage tracked, and the user's service lead is flagged for tenant review

**Database migration:**
```sql
-- No constraint change needed; code_type is free text
-- Just update the UI constant
```

### 5. Show Available Codes in Marketing Campaign Setup (Admin)

The `AdminCampaignCodes` component already shows linked codes in the admin marketing dialog. No additional work needed here — it is already connected.

## Summary of File Changes

| File | Change |
|---|---|
| Migration | Add `event_id` column to `tenant_codes` |
| `src/components/tenant/CampaignCodeLinker.tsx` | Add `eventId` prop support alongside `campaignId` |
| `src/pages/tenant/TenantEvents.tsx` | Add code linker section to event cards and create/edit dialog |
| `src/components/auth/ZipCheckStep.tsx` | Try tenant code validation as fallback when bypass code fails |
| `src/hooks/useRegistrationZipCheck.ts` | Add tenant code validation path |
| `src/pages/tenant/TenantCodes.tsx` | Add "verification" to `CODE_TYPES`, add "Event" column |
| `src/hooks/useTenantCodes.ts` | Support `event_id` in create/update mutations |

