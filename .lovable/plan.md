# P-2: Dual-Header Rollout to FGN Academy

Academy Phase A is live and now reads `X-Ecosystem-Key`. We ship the outbound side from play.fgn.gg with a backwards-compatible dual-header window so neither side can break the other.

## Scope

Single edge function change + docs + memory note. No DB migration, no frontend, no `ecosystem-data-api` change (already validates `X-Ecosystem-Key`).

## Changes

### 1. `supabase/functions/sync-to-academy/index.ts`

- Read both secrets at startup:
  - `FGN_ACADEMY_API_KEY` (legacy)
  - `ECOSYSTEM_API_KEY` (new, already stored)
- Fail only if **both** are missing. If either is present, proceed.
- On the outbound `fetch()` to the academy URL, set whichever headers we have:
  - `X-App-Key: <FGN_ACADEMY_API_KEY>` when present (legacy)
  - `X-Ecosystem-Key: <ECOSYSTEM_API_KEY>` when present (new)
- Log a single line indicating which header(s) were sent (names only, never values), e.g. `academy sync headers: X-App-Key,X-Ecosystem-Key`.
- Include the header-set summary in `ecosystem_sync_log.error_message` on failures so we can audit which combo Academy rejected (still names only).
- No change to payload, URL resolution, response handling, next-step logic, or notifications.

### 2. `docs/fgn-academy-integration.md`

- Add a "Header Migration" section: during the 14-day cutover both `X-App-Key` and `X-Ecosystem-Key` are sent. After the cutover (P-3) only `X-Ecosystem-Key` remains.
- Note the secret names and that `FGN_ACADEMY_API_KEY` will be retired in P-3.

### 3. `mem://integrations/fgn-academy`

- Append a short note: dual-header window active, `ECOSYSTEM_API_KEY` is the canonical key, `FGN_ACADEMY_API_KEY` retires in P-3 (+14 days from Academy cutover confirmation).

## Out of scope (P-3, +14 days)

- Drop `X-App-Key` and `FGN_ACADEMY_API_KEY` from `sync-to-academy`.
- Delete the `FGN_ACADEMY_API_KEY` secret.
- Stop reporting `academy_key_configured` in `ecosystem-data-api` health.

## Verification

1. Deploy `sync-to-academy`.
2. Trigger a manual challenge completion sync from Admin → Challenges.
3. Check edge function logs for the `academy sync headers:` line — expect both names.
4. Check `ecosystem_sync_log` for a `success` row with `target_app=fgn_academy`.
5. Ask Academy to confirm they observed `X-Ecosystem-Key` on the inbound request and validated it.

## Risk

Low. Sending an extra header to an endpoint that ignores it is a no-op; sending the legacy header keeps current behavior intact. Failure mode reverts cleanly by removing `ECOSYSTEM_API_KEY` from this project.
