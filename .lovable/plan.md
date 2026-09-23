# FGN Studio read API (partner catalog access)

Answer the FGN Studio brief with a real, documented, authenticated read-only API, plus a way for you to issue and revoke a key per partner tool.

## What Studio gets told

- There is no `api.fgn.gg` host and no REST API on `play.fgn.gg`. The site there is the player app; their guessed paths were absorbed by it, exactly as they suspected.
- The API lives on the platform's backend function host, at a base path of `/functions/v1/studio-api`. A stable alias is documented so they never have to guess again.
- They must not use the database data API directly. The new endpoints replace that need.
- Yes, "activity" has a durable identity: canonical Simulation Activity, already live and already published to Academy.
- Yes, challenges carry an active/inactive state, and an authorized read returns inactive records with a flag rather than hiding them.
- Yes, the tenancy model can scope a credential to one organization, enforced on our side.

## Partner credentials

New table of partner keys. Each key record holds: a label, the hashed key (raw value shown once at creation), the organization it is scoped to (or platform-wide), allowed capabilities, expiry, revoked flag, last-used timestamp.

- Key is sent as `Authorization: Bearer <key>`.
- Absent or invalid or expired or revoked key gives 401.
- Reading an organization the key is not scoped to gives 403.
- Rate limit per key, exceeding it gives 429.
- Existing shared ecosystem key is untouched; Academy and Merits keep working exactly as they do now.

An admin screen under Ecosystem lets you create a key, pick the organization scope and expiry, copy the value once, and revoke.

## Endpoints (all GET, JSON, cursor paginated)

- `/capabilities` — contract version, organization id and label, authenticated true/false, capability list, whether inactive records are included.
- `/sources` — one entry per game: id, label, a source version derived from the newest change in that game's catalog, challenge count.
- `/challenges?sourceId=` — challenge id, name, active flag, kind (track), difficulty, points, task ids in order, canonical activity id, content classification, Academy relationship marker.
- `/activities` — canonical activity id, name, action description, game, category, industry domain, status, the challenge ids that express it.
- `/work-order-relationships?activityIds=` — the relationships we actually hold on our side, clearly marked; Academy stays the authority for its own work orders, and the contract says so rather than guessing.

Conventions honoured: server-issued stable ids (database UUIDs, never reused, no `local:` / `proposal:` / `sim-` prefixes), `cursor` + `limit` with `nextCursor` null only at true exhaustion, per-source versions, and the status codes above.

## Contract document

`docs/studio-api.openapi.yaml` with a `contractVersion` string, served at a public docs path so Studio can fetch it unauthenticated. The `X-Studio-Contract` request header is accepted and echoed; a mismatch is reported, not silently ignored.

## Notes on scope

- Read-only. No write, submit, or state-change route, matching their section 7.
- No change to the player experience, and no change to the existing ecosystem API, webhooks, or Academy/Merits integrations.
- The activities read returns what exists today (the golden-path set); the parked ATS rollout will simply add rows later, no contract change.

## Technical detail

- New edge function `studio-api` with `verify_jwt = false` (it does its own bearer-key auth), routed by path segment, using a service-role client after the key check; every read is filtered by the key's organization scope server-side.
- New table `partner_api_keys` with GRANTs, RLS admin-only, and a SHA-256 hash column; the function looks keys up by hash.
- Cursor is an opaque base64 of the ordering tuple (`created_at`,`id`), so a repeated or stale cursor cannot loop.
- Source version = `max(updated_at)` across a game's challenges and their tasks, returned as an ISO timestamp.
- Each authorized read appends to `ecosystem_sync_log` for auditability.
- Admin UI: new tab in the existing Ecosystem admin page; list, create, revoke.
