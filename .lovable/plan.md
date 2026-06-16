# Link Users to Tenant Without ZIP

Today, even when a user "has a tenant" (via invite/tenant code or a tenant-branded link), the signup flow forces a valid ZIP before they can create an account, and the database trigger silently drops the tenant association if no ZIP is provided. Result: those users land in the FGN fallback cohort instead of their actual tenant.

This plan fixes both layers.

## 1. Database — never drop the tenant link

`public.user_service_interests.zip_code` is currently `NOT NULL`, which is why `handle_new_user` can't insert a row when ZIP is missing.

- Migration: make `user_service_interests.zip_code` nullable.
- Update `handle_new_user` so that when `selected_tenant_id` is present, the row is inserted whether or not `zip_code` is set. The existing FGN fallback (no tenant → FGN cohort) stays unchanged.
- No backfill needed (existing rows already have ZIPs).

## 2. Tenant code path — pass tenant_id through

In `src/components/auth/ZipCheckStep.tsx`, when a fallback invite/tenant code validates via `validate-tenant-code` and returns a `tenant_id`, call `onProceed(tcData.tenant_id)` instead of `onProceed()`. Platform bypass codes (no tenant) continue to call `onProceed()` with no argument.

This way `selectedTenantId` is set on the signup metadata even though the user never typed a ZIP.

## 3. Tenant landing URL — `?tenant=<slug>`

In `src/pages/Auth.tsx`:

- Read `tenant` from `useSearchParams()`.
- On mount (signup mode only, non-invite), if present, look up the tenant by slug (id, name, `require_subscriber_validation`), store `selectedTenantId`, and:
  - if `require_subscriber_validation` → jump straight to `subscriber-verify`,
  - else → jump straight to `account`.
- Skip the ZIP step entirely in this case. `zipCode` remains empty and is sent as such in signup metadata.
- Show a small "Signing up with **{Tenant Name}**" banner above the account form so the user understands the context.

If the slug doesn't resolve, fall back to the normal ZIP step and surface a toast ("That provider link is no longer valid — please enter your ZIP.").

## 4. Signup payload

`handleSubmit` already forwards `selected_tenant_id` and `zip_code` from state. No change needed there — once steps 1–3 are in, the trigger will correctly link the user to the right tenant even when `zip_code` is empty.

## Out of scope

- No UI changes to ZIP step beyond passing `tenant_id` from a validated tenant code.
- No new tenant-admin/staff logic.
- No backfill of historical users (already covered by previous migration that moves orphans into FGN; admins can re-tag them manually if needed).

## Technical notes

- Files touched: `supabase/migrations/<new>.sql`, `src/pages/Auth.tsx`, `src/components/auth/ZipCheckStep.tsx`.
- Migration is idempotent: `ALTER COLUMN ... DROP NOT NULL` + `CREATE OR REPLACE FUNCTION handle_new_user`.
- RLS on `user_service_interests` is unchanged; nullable ZIP does not affect policies (none reference `zip_code`).
