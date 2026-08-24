# Invite darcylorincz@hotmail.com to the sub-account, and land invitees on the right tenant

## What the data shows today

- `darcylorincz@hotmail.com` has one pending invite, and it is for **Acme Broadband** with role **admin** — that is why the landing page was Acme.
- **college test 1** (sub-account of Acme Broadband) has one pending invite, but it is addressed to `darcylorincz@gmail.com` with role **manager**. Its only seated member is darcy@fgn.gg, seeded from the parent as a manager.
- You are signed in as a platform admin, so the tenant portal auto-selects the first active tenant alphabetically (Acme Broadband) whenever no tenant is stored — the invited-tenant hint is currently only applied on the invite-claim path.

## Where the sub-account is visible today

- Tenant portal: the tenant switcher in the portal header lists "college test 1".
- Admin -> Tenants: the "Sub-accounts" tab, where it appears indented under Acme Broadband.

## Changes

1. **Invite the hotmail address to college test 1**
   - Add a pending invitation row for `darcylorincz@hotmail.com` on tenant `college test 1` with role **manager**, invited by darcy@fgn.gg.
   - Send it through the existing `send-tenant-invite` function so the email carries `next=/tenant` and `tenant=college-test-1`.
   - The existing Acme Broadband admin invite is left in place.

2. **Make the invited tenant win the landing decision**
   - On arrival at `/auth` with a `tenant=<slug>` hint, store the slug so it survives email confirmation and sign-in.
   - After invitations are claimed, resolve that slug to a tenant id and set it as the selected tenant *before* navigating — including for platform admins, whose auto-select currently overwrites nothing but runs first on a fresh browser.
   - In the tenant admin hook, skip the "auto-select first tenant" effect while a pending invite tenant hint is present, so the hint is not clobbered on first render.
   - Clear the hint once it has been applied, so later normal sign-ins keep whatever tenant the user last chose.

## Technical notes

- Invitation row: `public.tenant_invitations` (`email`, `tenant_id`, `role`, `invited_by`), inserted via data SQL, not a migration.
- Frontend touch points: `src/pages/Auth.tsx` (store/consume the tenant hint around `claim_pending_invitations`), `src/hooks/useTenantAdmin.ts` (guard the auto-select effects, reuse the exported `selectTenantId`).
- No schema, RLS, or role changes.

## Verification

- Confirm the new pending invitation exists for the hotmail address on college test 1.
- Confirm the emailed CTA contains `next=/tenant` and `tenant=college-test-1`.
- Sign in through that link in a clean session and confirm the portal opens on college test 1, with the switcher still able to move to Acme Broadband.
