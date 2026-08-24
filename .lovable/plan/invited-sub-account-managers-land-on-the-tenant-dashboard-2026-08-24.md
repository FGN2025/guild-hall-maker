# Invited sub-account managers land on the tenant dashboard

Goal: when someone accepts a sub-account manager invite, they end up on that sub-account's tenant dashboard (`/tenant`) with the correct tenant already selected — not the generic player dashboard.

## Behaviour after this change

1. Invite email button links to the sign-up/sign-in screen with a return target of the tenant portal and the invited tenant identified.
2. After the person signs up and confirms their email (or signs in with an existing account), their invitation is claimed as it is today.
3. They are then sent to `/tenant` with the invited sub-account pre-selected as the active tenant, so branding, team, and marketing all show that sub-account.
4. If, for any reason, the claim did not grant them a manager seat, the existing route guard sends them to `/dashboard` as it does today — no dead end.

## Technical changes

- `supabase/functions/send-tenant-invite/index.ts`
  - Accept an optional `tenantId` / `tenantSlug` in the payload.
  - Build the CTA as `/auth?invite=true&email=...&next=%2Ftenant&tenant=<slug>` so the existing `next` return-path plumbing (`sanitizeReturnPath`) carries the destination through sign-in and email confirmation.
- `supabase/functions/provision-sub-tenant/index.ts`
  - Pass the newly created sub-tenant's id and slug through to `send-tenant-invite`.
- `src/pages/Auth.tsx`
  - The confirmation-polling branch currently hardcodes `navigate("/dashboard")`; change it to use `postAuthTarget` like the other two paths so `next=/tenant` is honoured.
  - After `claim_pending_invitations` succeeds, if an invited tenant slug is present in the URL, resolve it to a tenant id and write it as the selected tenant (same storage key `useTenantAdmin` reads) before navigating.
  - Note: `?tenant=<slug>` is currently used to preselect a provider during ZIP signup and is skipped for invite flows, so reusing it for invites is safe; the invite branch just reads it for the post-claim tenant selection.
- No database, RLS, or role changes — the invite grant path is unchanged.

## Verification

- Provision a sub-account with an email invite, confirm the emailed link contains `next=/tenant` and the sub-account slug.
- Complete signup with a fresh address and confirm landing on `/tenant` showing the sub-account, with the tenant switcher still able to move elsewhere.
- Sign in with an existing invited account and confirm the same landing behaviour.
