# Close Remaining Registration-Visibility Gaps

## Why

Recent fixes unblocked tenant admins from seeing emails and made ZIP validation local-first. Four items were left out of scope. Three of them don't affect registration visibility (see assessment table in chat). The remaining one — the orphan sweep — is small but real, and the underlying trigger (`handle_new_user`) can let new orphans appear whenever sign-up metadata lacks tenant hints. This plan closes both.

## Scope

### 1. One-shot backfill (data repair)

Three idempotent `INSERT … ON CONFLICT DO NOTHING` statements, run as a migration so it's auditable:

- **Pattern B (2 known rows today):** every `legacy_users` with `matched_user_id` gets a `user_service_interests` row in its tenant, `status='legacy'`.
- **Pattern A (0 today, future-proof):** every `profiles.zip_code` that maps to a tenant via `tenant_zip_codes` gets a `user_service_interests` row in that tenant, `status='new'`.
- **Pattern C (0 today, future-proof):** when an FGN-fallback row exists and the user's ZIP now maps to a real tenant, insert a real-tenant row alongside it (do not delete the FGN row — safer to keep both).

### 2. Harden `handle_new_user` trigger (prevent recurrence)

Extend the existing trigger so, after the current `selected_tenant_id` / `provider_tenant_ids` logic, it also:
- Looks up the new user's ZIP in `tenant_zip_codes` and inserts `user_service_interests` rows for every matching tenant (`ON CONFLICT DO NOTHING`).
- Keeps the FGN fallback only when nothing matched.

This closes the door on Patterns A, C, and most B-style gaps for any future sign-up path (Discord OAuth, magic link, embed, etc.).

### 3. Admin re-scan tool (operational safety net)

Add a `SECURITY DEFINER` RPC `public.admin_resync_tenant_registrations()` (admin-only via `has_role`). It runs the same three backfill queries on demand and returns `{ pattern_a, pattern_b, pattern_c }` counts. Wire a small "Re-scan registrations" button into `AdminTenants.tsx` that calls it and toasts the result. Lets ops fix new orphans without a migration.

## Verification

- Run migration → 2 Pattern-B rows land, 0 others (matches current scan).
- Create a test user with a NineStar ZIP via plain sign-up (no provider selection) → `user_service_interests` row appears for NineStar; no FGN fallback row created.
- Click the admin "Re-scan registrations" button → toast shows `{0, 0, 0}` immediately after the backfill.
- Brian's NineStar Players list still shows the existing 5 users + any new sign-ups.

## Explicitly NOT in this plan

- Bulk-loading `national_zip_codes` (cosmetic; separate decision on dataset source).
- Touching `useRegistrationZipCheck` / `ZipCheckStep` / `TenantZipCodes` UIs.
- Deleting the redundant FGN fallback rows when a real tenant exists (safer to keep both; audit later).
- Sweeping the 13 profiles with no `user_service_interests` (all are platform staff / test accounts; trigger would have to bypass `prevent_player_tenant_admin` for staff — out of scope).
