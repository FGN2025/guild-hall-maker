

# Phase 2: Tenant Billing UI

## Files to Create

### 1. `src/hooks/useTenantBilling.ts`
- Query `tenant_subscriptions` table filtered by `tenant_id` from `useTenantAdmin`
- Provide `subscribe(priceId)` — invokes `create-checkout` edge function, opens returned URL
- Provide `managePortal()` — invokes `customer-portal` edge function, opens returned URL
- Provide `checkSubscription()` — invokes `check-subscription` edge function for live Stripe status
- Return: `subscription` (row data or null), `isSubscribed`, `isLoading`, `subscribe`, `managePortal`

### 2. `src/components/tenant/TenantBillingCard.tsx`
- Card showing current plan status:
  - **No subscription**: Show plan details (Tenant Basic $850/mo) with "Subscribe" button
  - **Active**: Show green status badge, plan name, renewal date, "Manage Subscription" button (opens Stripe portal)
  - **Past due / Canceled**: Show warning badge with appropriate CTA
- Uses `useTenantBilling` hook
- Only visible to tenant admins (role check already handled by settings page access)

## Files to Edit

### 3. `src/pages/tenant/TenantSettings.tsx`
- Import and render `<TenantBillingCard>` as the first card in the settings page
- Handle `?checkout=success` and `?checkout=canceled` URL params with toast notifications

### 4. `src/components/tenant/TenantSidebar.tsx`
- Add "Billing" nav item (`/tenant/billing`) with `CreditCard` icon, restricted to `admin` role
- Position it before "Settings" in the sidebar items array
- Note: billing will render on the settings page for now; the sidebar link routes to `/tenant/settings` with a billing anchor, or we add a dedicated `/tenant/billing` route that redirects to settings. Simpler approach: just add the billing card to settings and skip a separate route.

### 5. `src/contexts/AuthContext.tsx`
- Add `subscriptionStatus: 'active' | 'inactive' | 'past_due' | 'loading'` to context
- After role fetch completes for tenant staff users, call `check-subscription` edge function
- Expose `subscriptionStatus` so other components can gate features based on billing status

## Technical Notes
- Edge functions are already deployed (`create-checkout`, `check-subscription`, `customer-portal`)
- `tenant_subscriptions` table exists with RLS policies
- All edge function calls use `supabase.functions.invoke()` with auth token
- `STRIPE_PRODUCTS` constants already defined in `src/lib/stripeProducts.ts`

