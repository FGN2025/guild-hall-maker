# Restrict Players from Tenant Admin Role

## Problem
Soccepro64 (a player who registered through Huxley's ZIP signup) was added to `tenant_admins` with role `admin`, granting access to Huxley's tenant dashboard. He has no platform-level role, only this tenant_admins row. The row was added via the Team page (`/tenant/team`) by another Huxley admin clicking "Add" with role=Admin.

There is no enforcement preventing a registered player (subscriber/lead) from being elevated to tenant_admin. Any tenant admin can mistakenly do this from the Team page.

## Goal
Players (users who registered as subscribers / have `user_service_interests` or `tenant_subscribers` records, i.e. not staff via invite/provisioning) must never appear in `tenant_admins`.

## Approach: Database trigger (strongest enforcement)

### 1. Define "is a player"
A user is considered a player if **any** of these are true:
- A row exists in `user_service_interests` for them, OR
- A row exists in `tenant_subscribers` linked to their `user_id`

These are populated only by the ZIP-code signup flow. Staff added via `tenant_invitations` / `provision-tenant` / Platform Admin assignment do not get these rows.

### 2. BEFORE INSERT/UPDATE trigger on `public.tenant_admins`
Reject the row if the target `user_id` is a player. Exception: Platform admins (`has_role(user_id, 'admin')`) bypass — they can hold any role.

```sql
CREATE OR REPLACE FUNCTION public.prevent_player_tenant_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Platform admins are exempt
  IF public.has_role(NEW.user_id, 'admin') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_service_interests WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM public.tenant_subscribers WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Cannot grant tenant team access to a registered player. The user signed up as a subscriber and must remain a player-only account.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_prevent_player_tenant_admin
BEFORE INSERT OR UPDATE OF user_id, role ON public.tenant_admins
FOR EACH ROW EXECUTE FUNCTION public.prevent_player_tenant_admin();
```

### 3. Cleanup existing data
- Delete soccepro64's row: `tenant_admins` where `user_id='02689eee-0885-43a4-b0c5-5dd217280365'` and `tenant_id='b93a1fc0-...'`.
- Audit query: list all current `tenant_admins` rows whose `user_id` is also in `user_service_interests`/`tenant_subscribers` and is not a platform admin. Present the list to the user before bulk-removal (separate step, not auto-deleted).

### 4. UI safety net (small)
On `TenantTeam.tsx` "Search User → Add", catch the trigger error and surface a clear toast: "This user is registered as a player and cannot be added to the team."

## Files / changes
- New migration: trigger + function above.
- Insert (data) tool: delete soccepro's `tenant_admins` row.
- `src/pages/tenant/TenantTeam.tsx`: improve `handleAdd` error toast to detect the error code/message.

## Out of scope
- Changing how `provision-tenant` or invite claims work — those paths don't touch subscriber accounts.
- Modifying RLS (trigger is sufficient and uniform across all callers including service-role).
- Auto-purging other historical rows (will be presented as a list first).
