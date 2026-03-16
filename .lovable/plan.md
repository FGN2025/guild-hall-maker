

# Option C: Cloud Gaming Scaffold + Stripe Billing Foundation

## Overview

Build two parallel features: (A) a Cloud Gaming tenant add-on with database schema and UI scaffolding, and (B) Stripe-powered billing for tenant subscriptions. Neither blocks the other.

---

## Part A: Cloud Gaming Tenant Feature

### Database (3 new tables via migration)

1. **`tenant_cloud_gaming`** — per-tenant cloud gaming settings
   - `id` uuid PK, `tenant_id` uuid FK tenants (unique), `is_enabled` boolean default false, `blacknut_account_id` text nullable, `max_seats` integer default 0, `subscription_tier` text default 'none', `created_at` timestamptz
   - RLS: tenant admins can SELECT/UPDATE their own row; platform admins full access via `has_role()`

2. **`cloud_games`** — cached Blacknut game catalog (shared, not tenant-scoped)
   - `id` uuid PK, `blacknut_game_id` text unique, `title` text, `description` text nullable, `cover_url` text nullable, `genre` text nullable, `is_active` boolean default true, `deep_link_url` text nullable, `created_at` timestamptz
   - RLS: authenticated users can SELECT active games; admins can INSERT/UPDATE/DELETE

3. **`subscriber_cloud_access`** — tracks which subscribers have cloud gaming seats
   - `id` uuid PK, `tenant_id` uuid FK tenants, `user_id` uuid (not FK to auth.users), `is_active` boolean default true, `activated_at` timestamptz default now(), `deactivated_at` timestamptz nullable
   - Unique on (tenant_id, user_id)
   - RLS: tenant admins manage their own tenant's rows

### UI Changes

- **`src/pages/tenant/TenantSettings.tsx`** — Add a "Cloud Gaming" card with an enable/disable toggle, seat count display, and a "Coming Soon" badge for the Blacknut connection field
- **`src/components/tenant/CloudGamingCard.tsx`** — New component for the cloud gaming configuration card (toggle, seat management, status)
- **`src/hooks/useTenantCloudGaming.ts`** — Hook for CRUD on `tenant_cloud_gaming` table
- **`src/pages/tenant/TenantGuide.tsx`** — Add a Cloud Gaming section to the tenant guide

### No Blacknut API calls yet — the catalog table and "Play Now" buttons are scaffolded but inactive until API credentials arrive.

---

## Part B: Stripe Billing Foundation

### Step 1: Enable Stripe
- Use the `stripe--enable_stripe` tool to connect Stripe and collect the secret key

### Step 2: After Stripe is enabled
- Stripe integration details (products, checkout, webhooks) will be provided by the Stripe tooling. The general plan:
  - Create Stripe products for tenant plans (e.g., "Tenant Basic", "Tenant + Cloud Gaming")
  - Add a **Billing** card to `TenantSettings.tsx` showing current plan, manage subscription button, and payment method
  - Add a `/tenant/billing` or inline billing section
  - Webhook edge function for subscription lifecycle events (created, updated, canceled)
  - **`tenant_subscriptions`** table to track Stripe subscription ID, plan, status per tenant

### Step 3: Add "Billing" link to `TenantSidebar.tsx`

---

## Files to Create/Edit

| File | Action |
|---|---|
| Migration SQL | Create `tenant_cloud_gaming`, `cloud_games`, `subscriber_cloud_access` tables + RLS |
| `src/hooks/useTenantCloudGaming.ts` | Create — hook for cloud gaming settings |
| `src/components/tenant/CloudGamingCard.tsx` | Create — cloud gaming config UI |
| `src/pages/tenant/TenantSettings.tsx` | Edit — add Cloud Gaming card + Billing card |
| `src/components/tenant/TenantSidebar.tsx` | Edit — add Billing nav item |
| `src/pages/tenant/TenantGuide.tsx` | Edit — add Cloud Gaming guide section |
| Stripe setup + billing UI | After Stripe is enabled (details provided by tooling) |

---

## Implementation Order

1. Run database migration for 3 cloud gaming tables
2. Create cloud gaming hook and UI component
3. Add cloud gaming card to tenant settings
4. Enable Stripe (tool call)
5. Build billing UI and webhook based on Stripe tooling guidance
6. Update tenant guide with cloud gaming documentation

