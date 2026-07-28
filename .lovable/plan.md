## Tenant Admin Role — Production Hardening

Audit of the tenant admin surface found the role model is sound in concept (`admin` / `manager` / `marketing`) but enforcement is inconsistent: the UI hides things the database still allows. Below is what to fix, in risk order.

### 0. Billing authorization — deferred to backlog

`create-checkout` takes `tenant_id` from the request body with no membership or role check, and `stripe-webhook` trusts that metadata to write subscription and plan state. Any signed-in user can attach a checkout to a tenant they don't belong to. Per your call this moves to the backlog rather than this build — I'll record it in `.lovable/backlog/` as a known open authorization gap with the intended fix (platform-admin-only server-side guard on `create-checkout` and `customer-portal`) so it isn't lost.

### 1. Align database rules with intended role permissions

Decision applied: **admin + manager** for both subscribers and integrations; marketing blocked.

| Table | Today | After |
|---|---|---|
| `tenant_subscribers` | any tenant member (marketing included) | admin + manager |
| `tenant_integrations` | any tenant member | admin + manager |
| `tenant_zip_codes` | admin + manager | unchanged (already correct) |

A migration replaces the `is_tenant_member`-based policies with `is_tenant_admin_or_manager`. Marketing users currently able to read subscriber PII and integration credentials via direct API calls lose that access.

### 2. Route-level role gating

`TenantRoute` currently only asks "are you a member of any tenant" — no role check. Every `/tenant/*` page loads for every role via direct URL; some redirect themselves afterwards, `/tenant/codes` doesn't redirect at all.

Fix: add a `requiredRoles` capability to `TenantRoute` and declare it per route in `App.tsx`, so the gate runs before the page mounts and fetches data:
- `admin` only: `/tenant/team`, `/tenant/codes`
- `admin` + `manager`: `/tenant/zip-codes`, `/tenant/subscribers`, `/tenant/settings` (all tabs, including integrations and account)
- everything else: any tenant role

Per-page `<Navigate>` guards get removed once the route gate covers them, so there's one place to reason about.

### 3. Sidebar / route consistency

Two mismatches to correct so managers stop seeing links that bounce them:
- `zip-codes` and `subscribers` are shown to managers in the sidebar but self-redirect anyone who isn't `admin` → managers keep access (matches the new rules above).
- `codes` is admin-only in the sidebar but ungated in the route → now genuinely admin-only.

### 4. Silent-failure hardening

Tenant mutation hooks (`useTenantSubscribers`, `useTenants` role/remove, zip delete) don't `.select()` back affected rows. Under RLS, a blocked update returns success with zero rows changed and the UI toasts "saved" — the exact class of bug already hit on scheduled-post approve. Since step 1 tightens RLS, this becomes live risk: a marketing user's stale tab would report success on a write that silently did nothing. Fix by selecting the affected id back and throwing when nothing was returned.

### 5. Plan tier — noted, not enforced

`plan_tier` (Basic/Pro) is display-only; nothing restricts Pro features to Pro tenants. Per your decision this stays informational for this push, recorded as an accepted gap.

### Verification before I call it done

- Sign in as each of the three tenant roles (test memberships on a scratch tenant) and confirm: marketing is bounced from settings/subscribers/codes; manager reaches subscribers/zip-codes/settings but not team/codes; admin reaches everything.
- Direct API attempt as a marketing user against `tenant_subscribers` and `tenant_integrations` returns a permission error, not silent success.
- Cross-check no existing tenant loses access it should keep — spot-check HCTC and Acme.

### Technical notes

- One migration: replaces the SELECT/ALL policies on `tenant_subscribers` and `tenant_integrations`; no schema change, no data change.
- `TenantRoute.tsx` gains a `requiredRoles?: Array<'admin'|'manager'|'marketing'>` prop; platform admins in tenant-switching mode always pass (they're forced to `tenantRole: 'admin'` already).
- No edge function changes in this build — billing guard is backlogged.
