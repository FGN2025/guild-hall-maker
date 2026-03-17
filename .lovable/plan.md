

## Tenant Self-Service Signup

A public-facing signup flow where broadband providers can register their organization, select a plan, and auto-provision their tenant -- all without admin intervention.

---

### User Flow

```text
Landing Page (/for-providers)
  │
  ├─ Hero: value prop for broadband providers
  ├─ Plan card: Tenant Basic @ $850/mo
  └─ "Get Started" CTA
        │
        ▼
  Signup Form (same page, scrolls down or modal)
  ├─ Organization Name
  ├─ Contact Email
  ├─ Admin Name (display_name)
  ├─ Password
  └─ Submit
        │
        ▼
  Edge Function: provision-tenant
  ├─ Creates auth user (or uses existing)
  ├─ Creates tenant row (status: 'pending')
  ├─ Creates tenant_admins row (role: admin)
  ├─ Creates Stripe checkout session
  └─ Returns checkout URL
        │
        ▼
  Stripe Checkout (redirect)
        │
        ▼
  stripe-webhook: checkout.session.completed
  ├─ Upserts tenant_subscriptions
  └─ Updates tenant status → 'active'
        │
        ▼
  Success redirect → /tenant/settings?checkout=success
```

---

### Technical Details

#### 1. New public page: `/for-providers`
- **File**: `src/pages/ForProviders.tsx`
- Hero section with value proposition, feature highlights, pricing card
- Registration form with fields: org name, slug (auto-generated from name), contact email, admin name, password
- Client-side validation (zod)
- Calls `provision-tenant` edge function on submit
- Redirects to Stripe checkout URL on success
- Add route to `App.tsx` (public, no auth required)

#### 2. New edge function: `provision-tenant`
- **File**: `supabase/functions/provision-tenant/index.ts`
- `verify_jwt = false` (public endpoint)
- Steps:
  1. Validate inputs (name, email, password)
  2. Create auth user via `supabase.auth.admin.createUser()` with `email_confirm: false`
  3. Generate slug from org name (lowercase, hyphenated, uniqueness check)
  4. Insert into `tenants` table with `status: 'provisioning'`
  5. Insert into `tenant_admins` (user_id, tenant_id, role: 'admin')
  6. Create Stripe checkout session (mode: subscription, tenant_basic price)
  7. Return `{ url: session.url }`
- On Stripe webhook completion, existing `stripe-webhook` handler already upserts `tenant_subscriptions`

#### 3. Database migration
- Add a check: ensure `tenants.slug` has a unique constraint (verify if already exists)
- No new tables needed -- uses existing `tenants`, `tenant_admins`, `tenant_subscriptions`

#### 4. Update stripe-webhook
- After upserting `tenant_subscriptions` on checkout complete, also update `tenants.status` to `'active'` when the subscription is for the tenant_basic price

#### 5. Landing page link
- Add "For Providers" link to the Navbar (public nav items) and Index footer

#### 6. Config
- Add `provision-tenant` to `supabase/config.toml` with `verify_jwt = false`

#### 7. Update guides & white paper
- Add self-service signup documentation to Admin Guide and White Paper

---

### Files to create/modify

| Action | File |
|--------|------|
| Create | `src/pages/ForProviders.tsx` |
| Create | `supabase/functions/provision-tenant/index.ts` |
| Edit | `src/App.tsx` (add route) |
| Edit | `src/components/Navbar.tsx` (add link) |
| Edit | `src/pages/Index.tsx` (add footer link) |
| Edit | `supabase/functions/stripe-webhook/index.ts` (activate tenant on checkout) |
| Edit | `supabase/config.toml` (add function config) |
| Edit | Guide/White Paper pages |
| Migration | Verify slug uniqueness constraint |

