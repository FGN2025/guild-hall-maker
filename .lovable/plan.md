

The Billing card on `/tenant/settings` is currently shown to all tenant roles (admin, marketing, etc.) when there's no active subscription. The user wants it restricted to **Platform Admins only** — not even Tenant Admins should see/manage billing.

## Current behavior
`TenantSettings.tsx` line: `{!isSubscribed && <TenantBillingCard />}` — renders for any user who can reach the settings page (any tenant role + platform admin).

## Fix

Gate the Billing card on `isAdmin` from `useAuth()`:

```tsx
const { isAdmin } = useAuth();
...
{isAdmin && !isSubscribed && <TenantBillingCard />}
```

This ensures:
- **Platform Admins** see billing (subscribe/manage)
- **Tenant Admins, Marketing, Moderators** never see the billing card
- Card still hides once subscription is active (existing behavior preserved)

## Files
- `src/pages/tenant/TenantSettings.tsx` — add `useAuth` import, gate the card

## Test
1. As Platform Admin on `/tenant/settings` → Billing card visible (if no sub)
2. Switch to a Tenant Admin user → Billing card hidden
3. As any tenant role → no billing card, all other settings still functional

