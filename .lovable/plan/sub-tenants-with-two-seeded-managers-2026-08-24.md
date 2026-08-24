# Sub-tenants with two seeded managers

Yes — this works cleanly on top of what already exists. Sub-tenants stay isolated tenant rows (no rollup), and creating one automatically seats **two** managers: the parent's admin(s) and the person the parent admin nominates as the sub's main manager.

## What gets built

### 1. Hierarchy on the tenant record
Add `parent_tenant_id` to `tenants` (nullable, self-reference). A tenant with a parent is a "sub-account"; everything else about isolation is unchanged — RLS still keys on flat `tenant_id`, so Valley cannot read EAC data by hierarchy alone.

### 2. Create Sub-Account flow
From the parent tenant's team screen (and from the platform admin tenant list), a "Create sub-account" action collects:
- Sub-account name, slug, and branding fields (logo, primary/accent colors) — the sub brands itself independently via the existing tenant branding fields.
- The nominated main manager: an existing user search, or an email invitation if they have no account yet.

On submit, in one server-side call:
- Insert the `tenants` row with `parent_tenant_id` set.
- Insert a `tenant_admins` row for the acting parent admin with `role = 'manager'` on the new sub.
- Insert a `tenant_admins` row (or a `tenant_invitations` row if invited by email) for the nominated manager with `role = 'manager'`.

Result: two managers at initiation, as asked. Manager already carries every manager and marketing capability in the current sidebar map, so no new permission tier is needed.

### 3. Parent admin default seat, kept honest
The parent admin's seat on the sub is a real `tenant_admins` row, not an implicit rule — so it shows in the sub's team list, can be revoked, and is fully auditable. If the parent tenant later adds another admin, that person does **not** get automatic access to existing subs; the parent admin adds them explicitly. (Auto-propagating every future parent admin into every sub is possible but expands blast radius; recommend keeping it explicit.)

### 4. Platform admin visibility and management
In the platform admin tenant screen:
- Tenants render as a parent/child tree, with a "Sub of <parent>" badge on children and a sub-account count on parents.
- A filter for "sub-accounts only" / "top-level only".
- Platform admin can reparent a sub, detach it to standalone, and add/remove/change roles for any tenant's staff (already supported) including the two seeded managers.
- The team panel labels each seat's origin: "Seeded from parent" vs "Added directly", so it is obvious why a Valley person is sitting in EAC.

### 5. Guide updates
Add a short sub-account section to the tenant and admin guides covering who sees what and how the two manager seats are created.

## Technical notes

- Migration: `ALTER TABLE public.tenants ADD COLUMN parent_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL`, plus an index and a trigger preventing self-reference and cycles (depth capped at one level).
- Add `source` (`'seeded_from_parent' | 'direct'`) to `tenant_admins` for the origin label.
- Sub-account creation goes through a new `provision-sub-tenant` edge function using a stateless service-role client, so the three inserts are atomic and the parent admin never needs write access to another tenant's rows from the client. It validates that the caller is a platform admin or an `admin` on the parent tenant.
- The existing `prevent_player_tenant_admin` trigger still applies, so a player account cannot be nominated as the sub manager.
- No changes to the 48 tenant-scoped RLS policies; isolation semantics stay exactly as they are today.
- Existing tenants get `parent_tenant_id = null` and are unaffected.

## Out of scope
Cross-tenant rollup reporting, shared billing across parent/sub, and the Discord channel-moderation module (separate track).
