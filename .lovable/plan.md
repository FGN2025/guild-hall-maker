

# Verified Provider Registration -- Full Workflow Implementation

## Overview

Complete the provider-found registration path by adding ISP selection, address collection, and optional subscriber validation (toggled per tenant by Super Admin).

## What Already Works
- ZIP validated via Smarty, providers looked up from `tenant_zip_codes`
- Providers displayed as a list, user proceeds to account creation
- All matched providers auto-linked as leads in `user_service_interests`

## What Needs to Be Built

### 1. Database: Add subscriber validation toggle to `tenants`

```sql
ALTER TABLE public.tenants
ADD COLUMN require_subscriber_validation boolean NOT NULL DEFAULT false;
```

### 2. Update `ZipCheckStep.tsx` -- ISP Selection Dropdown

- Replace the passive provider list with a selectable dropdown (or radio group if few providers)
- If only one provider matches, auto-select it
- Store the selected `tenant_id` in component state and pass it up to `Auth.tsx`

### 3. New Component: `SubscriberVerifyStep.tsx`

Shown after ISP selection only when the selected tenant has `require_subscriber_validation = true`.

- Collects: First Name, Last Name, and optionally Account Number
- Calls a new `validate-subscriber` edge function
- On success, allows proceeding to the account creation form
- On failure, shows an error with retry option

### 4. New Edge Function: `validate-subscriber`

- Accepts `{ tenant_id, first_name, last_name, zip_code, account_number? }`
- Queries `tenant_subscribers` table for a matching record (case-insensitive name + ZIP within that tenant)
- If no local match and the tenant has an active NISC or GLDS integration in `tenant_integrations`, calls the billing API for a real-time lookup
- Returns `{ valid: boolean, message: string }`

### 5. Update `Auth.tsx` -- Multi-Step Flow

Current flow: ZIP Check --> Account Form

New flow: ZIP Check (with ISP select) --> Subscriber Verify (conditional) --> Account Form

- Track `selectedTenantId` in state
- After ZIP step, check if the selected tenant requires validation by querying `tenants` table
- If yes, show `SubscriberVerifyStep` before the account form
- On signup, create a lead only for the **selected** tenant (not all matched providers)

### 6. Admin Toggle in Tenant Management

- Add a "Require Subscriber Validation" switch in the tenant edit UI (`AdminTenants.tsx`)
- Updates the new `require_subscriber_validation` column

## Flow Diagram

```text
[Enter ZIP] --> [Smarty validates] --> [Providers found]
                                            |
                                   [Select ISP from dropdown]
                                            |
                              [Tenant requires validation?]
                                    |              |
                                   Yes            No
                                    |              |
                          [Enter Name/Acct#]  [Skip to account form]
                                    |
                          [validate-subscriber]
                                    |
                              [Match?]
                               |      |
                              Yes    No
                               |      |
                        [Continue] [Error, retry]
```

## Files to Create
- `src/components/auth/SubscriberVerifyStep.tsx` -- Name/account verification form
- `supabase/functions/validate-subscriber/index.ts` -- Backend subscriber lookup
- `src/hooks/useSubscriberValidation.ts` -- Hook wrapping the edge function call

## Files to Modify
- `src/components/auth/ZipCheckStep.tsx` -- Add ISP selection dropdown, pass selected tenant up
- `src/pages/Auth.tsx` -- Add subscriber verification step, track selected tenant, update lead creation
- `src/pages/admin/AdminTenants.tsx` -- Add subscriber validation toggle
- `src/hooks/useRegistrationZipCheck.ts` -- Minor: expose selected provider info

## Database Changes
- Add `require_subscriber_validation` boolean column to `tenants` table

