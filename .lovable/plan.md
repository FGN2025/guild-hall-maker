# Fix: tenant admins can't see other users' names

## Root cause

The `profiles` table has only two SELECT policies:
- Platform `admin`/`moderator` can see all profiles
- Each user can see their own profile

There is **no policy granting tenant admins (`tenant_admins.role` admin/manager/marketing) read access to profiles of users tied to their tenant**. Because `profiles_public` is a `security_invoker=true` view over `profiles`, it inherits this restriction.

Result for chris@consolidatednd.com (a *tenant* admin, not a platform admin):
- **Players page** (`useTenantPlayers` → `profiles_public`): RLS filters out every other user's row, so `display_name` is `null` and the UI renders `—`. Only legacy rows render anything (and they show `legacy_username` because `first_name`/`last_name` are empty in `legacy_users`).
- **Leads page** (`useTenantLeads` → `profiles_public`): same — every joined profile comes back empty.
- **Team page** (`useTenantAdmins` → `profiles` directly): same RLS filter, so `display_name` is `null` for every teammate. The hook falls back to email via the `check-users-confirmed` edge function, which is why you see `laura@…`/`chris@…` instead of names.

When chris views as "Platform Admin" (the top-left badge in your screenshot), Postgres still evaluates RLS against his real `auth.uid()`. The tenant-switching UI does not elevate his database role to platform admin — so the same restriction applies.

The "Legacy status names don't show" symptom is a **separate, data-only issue**: legacy rows have `first_name`/`last_name` = NULL in `legacy_users`, so the UI falls back to `legacy_username`. There is no RLS problem there.

## Plan

### 1. Database (migration)

Add a tenant-scoped read path for profile display fields. Two options — recommended is **(a)** because it keeps the `profiles_public` consumers unchanged.

**(a) New RLS policy on `profiles`** allowing tenant admins/managers/marketing to read profiles of users who are linked to one of their tenants. Linkage = membership in `user_service_interests` for that tenant, OR a row in `tenant_admins` for the same tenant.

```sql
-- Helper: does _viewer share a tenant with _target?
create or replace function public.shares_tenant_with(_viewer uuid, _target uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_admins ta
    where ta.user_id = _viewer
      and (
        exists (select 1 from public.user_service_interests usi
                where usi.user_id = _target and usi.tenant_id = ta.tenant_id)
        or exists (select 1 from public.tenant_admins ta2
                   where ta2.user_id = _target and ta2.tenant_id = ta.tenant_id)
      )
  )
$$;

create policy "Tenant staff can view profiles of tenant members"
on public.profiles for select
using (public.shares_tenant_with(auth.uid(), user_id));
```

This exposes only the columns `profiles_public` already publishes (display_name, gamer_tag, avatar_url, discord_username, discord_avatar). No PII beyond what platform admins already see. `email` is not on `profiles` and stays inside the existing edge-function path.

### 2. Frontend — no logic changes required

`useTenantPlayers`, `useTenantLeads`, and `useTenantAdmins` already select the right columns and have email/`—` fallbacks. Once the policy is in place they will simply start returning the real `display_name`/`gamer_tag`.

Add a small loading guard on `TenantTeam` so the list waits for `useTenantAdmin().tenantInfo` before rendering names (cheap polish; not the root cause).

### 3. Legacy "no name" rows — recommendation only

Legacy players showing only their gamer tag is a data issue, not visibility:
- Short term: leave the existing fallback (`legacy_username`) and add a subtle "no name on file" tooltip on the Players page.
- Optional follow-up: extend the CSV/NISC/GLDS import to populate `first_name`/`last_name` when the source provides them, and add a "Bulk edit names" action for tenant admins. Not part of this fix unless you want it bundled.

## Files touched

- **New migration**: `shares_tenant_with()` + SELECT policy on `public.profiles`.
- `src/pages/tenant/TenantTeam.tsx`: small loading-state guard (optional, cosmetic).
- No changes to `useTenantPlayers.ts`, `useTenantLeads.ts`, or `useTenantAdmins.ts`.

## Verification

1. Sign in as chris@consolidatednd.com → `/tenant/team` shows "Chris Klaman" / "Laura …" instead of email fallbacks.
2. `/tenant/players` shows real `display_name` for every Matched/Verified/Unverified row (Legacy rows continue to show gamer tag — expected).
3. `/tenant/leads` shows real names.
4. Sign in as an unrelated tenant admin → cannot see chris's tenant's profiles (RLS still scoped).
5. Sign in as a regular player → still cannot see anyone else's profile (policy requires a `tenant_admins` row for the viewer).

## Rollback

`drop policy "Tenant staff can view profiles of tenant members" on public.profiles;` and `drop function public.shares_tenant_with(uuid, uuid);`.
