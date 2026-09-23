# FGN Studio read API (partner catalog access)

Answer the FGN Studio brief with a documented, authenticated, read-only catalog API, short-lived organization-scoped tokens instead of browser-held durable keys, and a published contract plus test results.

## What Studio gets told

- There is no `api.fgn.gg` host and no REST API on `play.fgn.gg`. That host serves the player app, which is why their guessed paths returned the page.
- The API lives on the platform's backend function host at base path `/functions/v1/studio-api`. That exact URL is documented; no alias is invented unless one really exists.
- They must not use the database data API directly.
- "Activity" has a durable identity: canonical Simulation Activity, already live and already published to Academy. Lookup by id is provided.
- Challenges carry active/inactive state, and an authorized read returns inactive records with a flag rather than hiding them.
- A credential is scoped to one organization, enforced server-side. There is no platform-wide Studio credential.

## Credentials (corrected)

Two layers:

1. **Durable partner key** — issued to an operator, never to a browser. Held by Studio's own server/proxy. Scoped to exactly one organization, with capability list, expiry, revoke switch, last-used timestamp. Stored only as a hash; the raw value is shown once at creation and never written to logs or sync records.
2. **Token exchange** — `POST /token` (the one non-GET route, and it mutates no content) takes a durable key and returns a short-lived bearer token, organization-scoped, carrying the same capability set, expiry in minutes. Studio's browser holds only this token, in memory. Revoking the durable key invalidates outstanding tokens.

Failures: 401 for absent/invalid/expired/revoked, 403 for out-of-scope or missing capability, 429 for rate limit. The organization is taken from the credential only — a caller-supplied organization id is never treated as authorization, only as a filter that must match the credential's scope or it yields 403.

Shared/global catalog records (platform-owned games, platform challenges, canonical activities) are visible to every authorized organization and flagged `scope: "global"`; organization-owned records are flagged `scope: "organization"` and only that organization sees them. Counts, nested tasks and relationship lists are filtered by the same rule, so a count never describes rows the caller cannot read.

Key creation and revocation live on a separate admin-only path in the platform admin UI, never on the partner surface.

## Endpoints (GET, JSON, cursor paginated)

- `/capabilities` — contract version, organization id and label, authenticated flag, capability list, inactive-visibility statement, current catalog revision.
- `/sources` — one entry per game: id, label, source revision, challenge count, scope flag.
- `/challenges?sourceId=` — id, name, **description**, active flag, kind/track, difficulty, points, canonical activity id, content classification, Academy relationship marker, scope flag, and **ordered task objects** (id, title, description, display order, verification type, task revision).
- `/challenges/{id}` — the same shape for one challenge, including full tasks.
- `/activities` and `/activities/{id}` — canonical activity id, name, action description, game, category, industry domain, status, expressing challenge ids.
- `/work-order-relationships?activityIds=` — the relationships we actually hold; Academy remains the authority for its own work orders and the contract says so.

## Pagination (corrected)

Cursors are server-signed (HMAC) and carry the ordering tuple, the query fingerprint, the credential's organization scope, and the revision the walk started at. A cursor that fails signature check, targets a different query or scope, or does not advance the ordering tuple is rejected with 400 rather than followed. Ordering is deterministic (`created_at`, then `id`), so forward progress is guaranteed and a repeat cursor cannot loop. `nextCursor` is null only at true exhaustion. Each page echoes the revision it was read at; if the catalog changed mid-walk the response carries `revisionChanged: true` so Studio can restart rather than silently merge two snapshots. Behaviour on mid-walk insert/delete is documented explicitly.

## Revisions (corrected)

A catalog revision counter, incremented by database triggers on every relevant change — insert, update **and delete** — across challenges, tasks, simulation activities and activity-challenge mappings. Each source carries its own revision derived from the same log, so deletions and mapping changes move the number. Responses carry both the global and per-source revision, and a read presented against an older revision is reported stale rather than trusted. Snapshot consistency guarantees are documented.

## Browser contract

CORS restricted to an approved-origin list (Studio's origins, configurable by admin), allowing `Authorization` and `X-Studio-Contract`. The contract header is required on every request: a missing or mismatched version returns 409 with the supported version list and no data. The OpenAPI document is served unauthenticated so Studio can self-check.

## Read-only boundary

Catalog routes accept GET only; any other method returns 405. No write, submit, or state-change route exists. The service-role client is constructed inside the edge function only, after the credential check, and never reaches the browser. Raw keys and tokens are excluded from all logging and from the sync log.

## Deliverables

- `docs/studio-api.openapi.yaml` with a contract version string.
- `docs/studio-api-integration.md` — owner instructions: exact URL, credential issuance and rotation, capability names, pagination and revision semantics, error codes.
- A verification report covering: authentication (none/invalid/valid), capability denial, cross-organization isolation, inactive visibility, complete task content, pagination to exhaustion plus interrupted and replayed cursors, revision movement on update and delete, revocation taking effect, and rate limiting.

## Scope guardrails

Read integration only. No Studio submissions, no canonicalization rollout, no production content activation. Existing ecosystem consumers (Academy, Merits, the shared ecosystem key and webhooks) and the player experience are untouched.

## Technical detail

- New edge function `studio-api`, `verify_jwt = false`, own bearer auth, path-segment routing.
- New tables: `partner_api_keys` (hashed key, tenant_id, capabilities, expires_at, revoked_at, last_used_at), `partner_access_tokens` (hashed short-lived token, key id, expiry), `catalog_revisions` (counter plus per-source rows, driven by triggers). All with GRANTs and admin-only RLS.
- Rate limiting per key, counted in the token/keys tables.
- Admin UI: a Partner Access tab in the existing Ecosystem admin page — issue, scope, set expiry, copy once, revoke, view last used.
