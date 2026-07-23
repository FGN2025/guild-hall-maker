## Context

Invite codes serve two audiences:
1. **Tournament participants** — code attributes the registration to a tenant campaign (and can gate access).
2. **New players not yet linked to a tenant** — code routes their signup to that tenant, whether or not the ZIP is in coverage.

Brian's test (`fred.wells.in@hotmail.com`, ZIP 90210 + `TOURNEY2026`) proved that today the ZIP path silently discards the code: `tenant_codes.times_used` stayed at 0, Fred landed on demo tenants, and Ninestar never saw him. Mr.Rosa69, kenzoya, and NoirAngel show `—` for Invite Code because no column persists it.

## Plan

### 1. Schema

Single migration:

- `tournaments.requires_invite_code BOOLEAN NOT NULL DEFAULT false`
- `tournaments.invite_code_id UUID REFERENCES tenant_codes(id)` (optional pin to a specific code; when null any active code for that tenant works)
- `user_service_interests.invite_code TEXT` + index
- `tournament_registrations.invite_code TEXT` + index

RLS unchanged; existing tenant-admin / platform-admin write policies already cover the new tournament columns.

### 2. Tournament creation/edit — mandatory-code toggle

`TournamentManage.tsx` and the create dialog in `useTournaments`:

- New "Require invite code to register" switch, visible to platform admins and tenant admins.
- When on, an optional `Select` lets them pin to a specific `tenant_codes` row (from that tenant's active codes) or leave as "any active tenant code".
- Persist `requires_invite_code` + `invite_code_id`; surface both in the participants view.

### 3. Signup — invite-code path

`ZipCheckStep.tsx` gains an explicit "I have an invite code" toggle (auto-enabled when the URL carries `?code=`):

- **ZIP path (default):** ZIP required, code optional. If a code is entered it's validated alongside the ZIP; on success it's used for attribution and — when the code's tenant isn't in the ZIP's provider list — for tenant routing. Fixes Fred's case.
- **Code path (toggle on / `?code=` in URL):** invite code **required**, ZIP optional. Continue button disabled until `validate-tenant-code` (dry run) returns valid. Routes the user to the code's tenant regardless of ZIP.

Rework `useRegistrationZipCheck`:
- Extend `ZipCheckResult` with `inviteCode?: string | null` and `codeTenantId?: string | null`.
- Add `checkCode(code)` for the code-only path; `checkZip(zip, code)` validates both when both are present.

`Auth.tsx` propagates `selected_tenant_id`, `invite_code`, and a `code_required` flag into signup metadata.

`handle_new_user` trigger:
- Stamps `invite_code` onto the created `user_service_interests` row.
- If `selected_tenant_id` is null but `invite_code` resolves to a valid `tenant_codes` row, uses that tenant.
- On the code path (`code_required=true`), rejects signup unless `invite_code` resolves to an active, non-exhausted `tenant_codes` row.
- Atomically bumps `tenant_codes.times_used`.

### 4. Tournament registration — enforce mandatory code

`useTournaments.register` accepts optional `inviteCode` and writes it to `tournament_registrations`.

`TournamentDetail.tsx`:
- Reads `?code=` from the URL and prefills.
- If `tournament.requires_invite_code` is true, the Register button is replaced by an "Enter invite code" input + Register-when-valid flow. Validation via `validate-tenant-code`; if `invite_code_id` is set the code must match, otherwise any active code for the tournament's tenant is accepted.
- Already-registered tenant members can still register with a code — captured for attribution, doesn't change tenant assignment.

### 5. Admin surfaces

- `get_tenant_lead_players` RPC returns `invite_code`; `TenantPlayers.tsx` populates the existing Invite Code column.
- `TournamentManage.tsx` participants table adds an Invite Code column and shows a "Code required" badge when the toggle is on.

### 6. Targeted backfill (with approval, after schema ships)

a. **`fred.wells.in@hotmail.com`** — insert Ninestar `user_service_interests` row with `invite_code='TOURNEY2026'`; remove the incorrect Fiber Fast / Acme Broadband rows.
b. **Mr.Rosa69, kenzoya, NoirAngel** — stamp `invite_code='TOURNEY2026'` on their existing Ninestar rows.
c. Set `tenant_codes.TOURNEY2026.times_used = 4`.

## Out of scope
- Broader code-performance analytics beyond `times_used` and the new columns.
- Backfill of `tournament_registrations.invite_code` (none of the four have in-app tournament rows yet).
- Cleaning up demo tenants that seed common ZIPs (90210, etc.).
