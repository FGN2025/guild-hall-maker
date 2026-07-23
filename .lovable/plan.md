## Goal

Fix invite-code attribution so tenants see who registered with their code, and let tournament creators mark codes as **optional** or **mandatory** at the tournament level.

## Behavior

- **New signup on `/auth`**
  - ZIP is the default path.
  - New toggle "I have an invite code" reveals a code field. When toggled, code is required; ZIP becomes optional (still asked for demographic routing but not blocking).
  - When both are provided, the invite code wins for tenant routing (fixes Fred's ZIP-90210 case going to demo tenants instead of NineStar).
  - The entered code is persisted on the resulting `user_service_interests` row and `tenant_codes.times_used` is incremented once per successful signup.

- **Tournament registration**
  - Tournament creator (tenant admin or super admin) can toggle **Require invite code** and pin a specific `tenant_codes` row.
  - If required, `/tournaments/:id` shows a code field; server-side registration verifies the entered code matches the pinned code (or, if none pinned, any active code from the creating tenant) before inserting the registration.
  - If not required, existing ZIP/tenant-member flow is unchanged; code field is optional and only used for attribution.
  - Entered code is stored on `tournament_registrations.invite_code`.

- **Tenant Admin visibility**
  - `Tenant → Players` shows the Invite Code column populated for signups.
  - `Tenant → Tournaments` roster shows the Invite Code used per registrant.

## Schema (single migration)

```text
tournaments
  + requires_invite_code boolean NOT NULL DEFAULT false
  + invite_code_id       uuid    REFERENCES tenant_codes(id) ON DELETE SET NULL

user_service_interests
  + invite_code text  -- captured at signup

tournament_registrations
  + invite_code text  -- captured at registration
```

Also update `handle_new_user()` to:
1. Read `invite_code` from `raw_user_meta_data`.
2. If present, look up `tenant_codes` by code (active, not expired, under max_uses), route the user to that `tenant_id` (in addition to any other matches), stamp `invite_code` on the inserted `user_service_interests` row, and increment `times_used`.
3. Keep existing ZIP + provider fallback logic intact.

RLS: new columns inherit existing table policies — no policy changes needed. Grants already cover these tables.

## Code changes

- `src/hooks/useRegistrationZipCheck.ts` — return `tenantId` and echo back the raw `code` string on success (already partially in place).
- `src/components/auth/ZipCheckStep.tsx` — add "I have an invite code" toggle; when on, code required, ZIP optional; pass `{ tenantId, inviteCode }` up.
- `src/pages/Auth.tsx` — include `invite_code` in signup metadata; prefer invite-code tenant over ZIP providers when both provided.
- `src/pages/tenant/TournamentManage.tsx` (and creation form) — add "Require invite code" switch + code picker (dropdown of tenant's active `tenant_codes`).
- `src/pages/TournamentDetail.tsx` — when `requires_invite_code`, show and require the code field; validate via `validate-tenant-code` before registering; write `invite_code` into `tournament_registrations`.
- `src/hooks/useTenantPlayers.ts` + Players table — surface `invite_code`.
- Tournament roster views — surface `invite_code`.

## Backfill (idempotent, in same migration)

- Fred (`fred.wells.in@hotmail.com`) → add `user_service_interests` row for NineStar with `invite_code = 'TOURNEY2026'`.
- Mr.Rosa69, kenzoya, NoirAngel → stamp `invite_code = 'TOURNEY2026'` on their existing NineStar `user_service_interests` rows.
- Increment `tenant_codes.times_used` for `TOURNEY2026` by the count of rows backfilled.
- All wrapped in `ON CONFLICT DO NOTHING` / `WHERE invite_code IS NULL` guards.

## Out of scope

- No changes to `validate-tenant-code` behavior beyond continued use of its `dry_run` mode.
- No new admin UI for bulk code assignment.
- No changes to bypass-code (platform-level) flow.
- No changes to Discord role assignment.
