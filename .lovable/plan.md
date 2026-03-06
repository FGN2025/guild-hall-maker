

# Invite Tenant Admins by Email (Pre-Registration)

## Problem
Currently, the Tenant Admin panel only lets you search for **existing** users by display name. If someone hasn't registered yet, there's no way to pre-assign them a tenant role.

## Approach
Add an **"Invite by Email"** flow alongside the existing "Search by name" flow. The platform admin enters an email address and selects a role. The system will:

1. **Check if the email already has an account** -- if so, assign the role immediately (existing flow).
2. **If not registered** -- store a pending invitation in a new `tenant_invitations` table. When that user eventually signs up, a database trigger automatically assigns the tenant role.

## Changes

### 1. Database Migration -- `tenant_invitations` table
```sql
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  invited_by uuid NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON public.tenant_invitations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant admins can manage their invitations"
  ON public.tenant_invitations FOR ALL
  TO authenticated
  USING (is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_admin(tenant_id, auth.uid()));
```

### 2. Database Trigger -- Auto-claim on signup
A trigger on `auth.users` insert that checks `tenant_invitations` for matching email and creates the `tenant_admins` row automatically.

**Note:** We cannot attach triggers to `auth.users` (reserved schema). Instead, we'll add logic to the existing `handle_new_user()` function or create a new function triggered by profile creation:

```sql
CREATE OR REPLACE FUNCTION public.claim_tenant_invitations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _inv RECORD;
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  FOR _inv IN
    SELECT * FROM public.tenant_invitations
    WHERE email = _email AND claimed_at IS NULL
  LOOP
    INSERT INTO public.tenant_admins (tenant_id, user_id, role)
    VALUES (_inv.tenant_id, NEW.user_id, _inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.tenant_invitations SET claimed_at = now() WHERE id = _inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_claim_tenant_invitations
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.claim_tenant_invitations();
```

### 3. UI -- `AdminTenants.tsx` TenantAdminPanel
Add a tabbed interface or toggle in the side panel:
- **Tab 1: Search existing users** (current flow, unchanged)
- **Tab 2: Invite by email** -- email input + role selector + "Send Invite" button

Show pending invitations below the current admins list with a "Pending" badge and a cancel button.

### 4. Hook -- `useTenants.ts`
Add mutations for:
- `createInvitation({ tenantId, email, role })` -- inserts into `tenant_invitations`
- `cancelInvitation(id)` -- deletes from `tenant_invitations`
- Query pending invitations alongside admins

## Files to Modify
| File | Change |
|---|---|
| Database migration | Create `tenant_invitations` table, RLS, trigger |
| `src/hooks/useTenants.ts` | Add invitation mutations + query pending invitations |
| `src/pages/admin/AdminTenants.tsx` | Add "Invite by Email" tab in TenantAdminPanel, show pending invitations |

