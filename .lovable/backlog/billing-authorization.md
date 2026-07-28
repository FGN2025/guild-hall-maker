# Backlog: Billing authorization gap (tenant checkout)

Status: **open / accepted risk** — deferred out of the tenant-admin hardening build.

## Problem

`create-checkout` accepts `tenant_id` from the request body and performs no
membership or role check on the caller. `stripe-webhook` then trusts the
metadata written by that session to update subscription and plan state for the
named tenant.

Consequence: any signed-in user can start a checkout session bound to a tenant
they have no relationship with, and the resulting webhook writes against that
tenant's subscription record.

`customer-portal` has the same shape of exposure — it resolves a tenant's
Stripe customer without proving the caller belongs to that tenant.

## Intended fix (when picked up)

1. In `create-checkout`, resolve the caller from the `Authorization` bearer
   token server-side and reject unless they are a platform admin (billing is
   platform-admin-only today). Never trust `tenant_id` from the body without
   that check.
2. Apply the same guard to `customer-portal`.
3. Keep `stripe-webhook` as-is (it is signature-verified), but only after the
   session metadata it consumes can no longer be attacker-controlled.
4. Verify: a non-admin signed-in user calling `create-checkout` with another
   tenant's id receives 403 and no Stripe session is created.

## Related, also deferred

`plan_tier` (Basic / Pro) is display-only. No feature is gated on it. If tier
enforcement is ever required, it needs a server-side check, not a UI check.
