# Fix: cannot assign an ISP to a player

## What is broken

In Admin > Users, the only control that assigns a provider (ISP/tenant) to a user is the tenant picker. When a tenant is picked, the app writes a **tenant staff record** (`tenant_admins`, role `admin`) rather than a player-to-provider link.

A database trigger (`prevent_player_tenant_admin`) deliberately blocks that write for anyone who looks like a player — has a ZIP code on their profile, an existing service interest, a subscriber record, or a matched legacy record — and raises:

"This user is registered as a player and cannot be added to a tenant team." (error 42501)

So for exactly the population you want to assign, the action always fails. The trigger is correct; the UI is using the wrong table.

Confirmed by reading the trigger definition, the assignment code in `useAdminUsers.ts`, and the policies on both tables.

## The fix

Separate the two concepts in the admin UI:

1. **Assign ISP (player link)** — writes `user_service_interests` (user_id, tenant_id, status `new`, zip_code copied from the profile when present). This is the table `get_user_tenant` and the ISP-linked checks already read, so the player immediately counts as ISP-linked for the prize shop and tenant-scoped features. Platform admins already have insert/delete policies on it.
2. **Tenant Role (staff)** — keeps writing `tenant_admins`, unchanged, and stays for staff only.

Also:
- Allow **changing** and **clearing** a player's ISP, not just setting it once (currently there is no way to move a player between providers).
- Stop the side-effect where granting a tenant role silently creates a service-interest row; keep staff and player links independent.
- Surface the real database message in the toast when a write is refused, so a blocked staff assignment reads as an explanation rather than a generic error.

## Technical notes

- `src/hooks/useAdminUsers.ts`: add `setUserTenant` mutation (upsert/delete on `user_service_interests`), remove the interest side-effect from `setTenantRole`, invalidate `admin-users`.
- `src/pages/admin/AdminUsers.tsx`: the Tenant column becomes an editable provider select (All providers list + "None") wired to `setUserTenant`; the Tenant Role column keeps its existing staff dropdown and only shows a value when a `tenant_admins` record exists.
- No migration and no RLS change required — existing policies already permit platform admins to manage `user_service_interests`.

## Verification

- Assign a provider to a player who has a ZIP code and confirm the row appears in `user_service_interests` and the Tenant column updates.
- Re-assign the same player to a different provider, then clear it.
- Confirm assigning a staff tenant role to a non-player still works and that a player-role attempt shows the trigger's explanation.
