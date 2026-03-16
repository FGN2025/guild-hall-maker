

# Stripe Payment Infrastructure — Phased Plan

## Current State

**Stripe products and prices already exist:**
- **Tenant Basic** (`prod_U9mi2XMZdwKSKC`) — $850/mo recurring (`price_1TBT8jC4M1A6BcTPiyEyHu24`)
- **Tenant Basic** duplicate (`prod_U9mhbkMlp2OYNb`) — $850/mo (`price_1TBT8IC4M1A6BcTP2iUaetgK`)
- **Cloud Gaming Package** (`prod_U9mfAZOF0p23ub`) — $29.99/mo per seat (`price_1TBT6ZC4M1A6BcTPCCEGAQp7`)

**What exists in code:** `STRIPE_SECRET_KEY` secret is stored. No Edge Functions, no database tables, no UI for payments.

**Auth system:** Full role-based auth with admin, moderator, tenant staff roles. No subscription state tracked.

---

## Phase 1 — Core Edge Functions + Database

**Database migration — `tenant_subscriptions` table:**

```text
tenant_subscriptions
├── id (uuid PK)
├── tenant_id (uuid FK → tenants)
├── stripe_customer_id (text)
├── stripe_subscription_id (text)
├── product_id (text)          -- Stripe product ID
├── price_id (text)            -- Stripe price ID
├── status (text)              -- active, canceled, past_due, trialing
├── current_period_end (timestamptz)
├── created_at / updated_at
└── RLS: tenant admins read own, platform admins read all
```

**Edge Functions to create:**

| Function | Purpose |
|---|---|
| `create-checkout` | Creates Stripe Checkout session for tenant subscription or subscriber add-on. Accepts `price_id` and optional `tenant_id`. Uses `mode: subscription`. |
| `check-subscription` | Looks up active Stripe subscription by user email. Returns `subscribed`, `product_id`, `subscription_end`. |
| `customer-portal` | Creates Stripe Customer Portal session for self-service management. |

All three follow the patterns from the Stripe implementation guide — CORS headers, JWT validation in code, `verify_jwt = false` in config.toml.

**Stripe product constants file** (`src/lib/stripeProducts.ts`):
```typescript
export const STRIPE_PRODUCTS = {
  tenant_basic: {
    product_id: "prod_U9mi2XMZdwKSKC",
    price_id: "price_1TBT8jC4M1A6BcTPiyEyHu24",
    name: "Tenant Basic",
    amount: 850_00,
    interval: "month",
  },
  cloud_gaming_seat: {
    product_id: "prod_U9mfAZOF0p23ub",
    price_id: "price_1TBT6ZC4M1A6BcTPCCEGAQp7",
    name: "Cloud Gaming",
    amount: 29_99,
    interval: "month",
  },
};
```

---

## Phase 2 — Tenant Billing UI

**Files to create:**
- `src/hooks/useTenantBilling.ts` — queries `tenant_subscriptions`, invokes `check-subscription`, provides `subscribe` and `managePortal` actions
- `src/components/tenant/TenantBillingCard.tsx` — shows current plan, status badge, renewal date, "Subscribe" or "Manage Subscription" button

**Files to edit:**
- `src/pages/tenant/TenantSettings.tsx` — add `TenantBillingCard` at the top
- `src/components/tenant/TenantSidebar.tsx` — add "Billing" nav link for admin role
- `src/contexts/AuthContext.tsx` — add `subscriptionStatus` field, call `check-subscription` on auth state change

**Flow:** Tenant admin clicks "Subscribe" → `create-checkout` Edge Function → Stripe Checkout (new tab) → returns to success page → `check-subscription` updates state → `tenant_subscriptions` row created/updated.

---

## Phase 3 — Subscriber Add-On Purchases (Cloud Gaming Seats)

**Database migration — `subscriber_purchases` table:**

```text
subscriber_purchases
├── id (uuid PK)
├── user_id (uuid FK)
├── tenant_id (uuid FK)
├── product_type (text)        -- 'cloud_gaming', 'merchandise'
├── stripe_session_id (text)
├── stripe_subscription_id (text, nullable)
├── status (text)              -- pending, active, canceled
├── amount (integer)
├── created_at
└── RLS: users read own, tenant admins read tenant-scoped
```

**Changes:**
- Update `create-checkout` to accept a `product_type` parameter and route to the correct `price_id`
- Create `src/hooks/useSubscriberPurchases.ts` for tracking user's active add-ons
- Update `CloudGamingConfigCard` and the player-facing Cloud Gaming page to show purchase/subscribe buttons for eligible subscribers
- When a cloud gaming subscription is created, auto-insert into `subscriber_cloud_access`

---

## Phase 4 — Merchandise Store Foundation

**New Stripe products needed:** Create merchandise products/prices via Stripe tools (one-time `mode: payment`).

**Files to create:**
- `src/pages/MerchStore.tsx` — grid of purchasable items with "Buy Now" buttons
- `src/hooks/useMerchProducts.ts` — reads from a new `merch_products` table (title, description, image, price_id, stock)

**Database migration — `merch_products` table:**

```text
merch_products
├── id, tenant_id, title, description, image_url
├── stripe_price_id, price_cents, is_active
├── stock_quantity (nullable)
└── RLS: public read, tenant admin write
```

**Edge Function update:** `create-checkout` handles `mode: payment` when `product_type` is merchandise.

---

## Phase 5 — Payment Status Tracking + Admin Visibility

**Files to create:**
- `src/pages/admin/AdminBilling.tsx` — platform-wide billing overview (all tenant subscriptions, recent purchases, revenue summary)
- `src/components/tenant/PurchaseHistoryPanel.tsx` — tenant-scoped view of subscriber purchases

**Files to edit:**
- `src/components/admin/AdminSidebar.tsx` — add "Billing" link
- `src/App.tsx` — add `/admin/billing` route

---

## Implementation Order

| Phase | Dependency | Deliverable |
|---|---|---|
| 1 | None | Edge Functions + DB table + constants |
| 2 | Phase 1 | Tenant subscription checkout + billing UI |
| 3 | Phases 1-2 | Subscriber cloud gaming seat purchases |
| 4 | Phases 1-2 | Merchandise store with one-time payments |
| 5 | Phases 1-4 | Admin billing dashboard + purchase history |

Phase 1 should be implemented first as all other phases depend on it. The `STRIPE_SECRET_KEY` is already configured, so no additional secrets are needed.

