# FGN Studio read integration — owner instructions

Contract version: **2026-09-23.1**
Base URL: **https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/studio-api**

There is no `api.fgn.gg` host, and `play.fgn.gg` serves the player web app only — that is why probed `/api/...` paths returned the page. No alias other than the base URL above exists today; do not assume one.
Do not use the project's database data API (`/rest/v1/`) as a substitute for these endpoints.

Machine-readable contract: `GET {base}/openapi.json` (unauthenticated), and `docs/studio-api.openapi.yaml` in this repository.

## 1. Credentials

Two layers, by design:

| Layer | Prefix | Where it lives | Lifetime |
| --- | --- | --- | --- |
| Durable partner key | `fgnk_` | Operator-owned server or proxy. Never a browser. | Until its expiry or revocation |
| Short-lived token | `fgnt_` | Studio browser session, memory only | 15 minutes |

Both are sent as `Authorization: Bearer <value>`. Exchange:

```
POST {base}/token
Authorization: Bearer fgnk_...
X-Studio-Contract: 2026-09-23.1
→ { token, tokenType, expiresAt, expiresInSeconds, organizationId, capabilities }
```

Revoking the durable key immediately invalidates it and every token minted from it.

Keys are stored hashed (SHA-256). The raw value is displayed once at creation and never appears in logs, sync records or any API response. Issue and revoke keys in the platform admin area (Admin → Ecosystem → Partner Access); that path is admin-authenticated and entirely separate from this partner surface.

Every credential is scoped to exactly one organization. There is no platform-wide Studio credential.

## 2. Capabilities

`catalog:read` (sources, challenges), `activities:read` (activities), `relationships:read` (work-order relationships). Every route checks the capability **and** the organization scope. `/capabilities` reports what a credential actually holds.

## 3. Authorization rules

- Organization scope is taken from the credential. An `organizationId` or `tenantId` query parameter is treated as a filter: if it differs from the credential's organization the request returns 403. A caller-supplied id is never authorization.
- Games, challenges, tasks and canonical simulation activities are platform-global records: every authorized organization sees them, flagged `scope: "global"`. Organization-owned records carry `scope: "organization"` and are visible only to that organization. Counts, nested tasks and relationship lists are filtered by the same rule, so a count never describes rows you cannot read.
- Inactive records are returned, flagged `isActive: false`, when the credential has `include_inactive` set (the default). `/capabilities` states this explicitly as `includesInactiveRecords`, so a hidden record can never be mistaken for a missing one. A credential configured without it receives active records only, and `/capabilities` says so.

## 4. Status codes

| Code | Meaning |
| --- | --- |
| 200 | Success |
| 400 | Cursor malformed, unsigned, bound to another query, or bound to another organization scope |
| 401 | Credential absent, invalid, expired, or revoked |
| 403 | Out-of-scope organization, or missing capability |
| 404 | Record not found, or inactive and not visible to this credential |
| 405 | Non-GET on a catalog route — this API is read-only |
| 409 | `X-Studio-Contract` missing or mismatched; response lists supported versions and carries no data |
| 429 | Per-key rate limit exceeded (default 120 requests/minute) |

## 5. Pagination

`cursor` + `limit` (default 50, max 200). Ordering is deterministic: `created_at` ascending, then `id` ascending.

A cursor is an HMAC-signed payload carrying the last ordering tuple, a fingerprint of the query, the credential's organization scope, and the revision the walk began at. Cursors are validated, not merely decoded: a bad signature, a cursor from another query, or a cursor from another organization is rejected with 400 rather than followed. Because the keyset strictly advances, a replayed cursor re-reads the same page and can never loop, and the walk always makes forward progress.

`nextCursor` is null only at true exhaustion. Treat an interrupted walk as an incomplete read.

**Records changing mid-walk:** each page echoes `revision` and `revisionChanged`. A record inserted before your position will not appear; a record deleted ahead of your position will be absent; an updated record is returned in whatever state it is in when its page is read. If `revisionChanged` is true, the catalog moved during the walk — restart rather than merging two snapshots. Pages are individually consistent; a multi-page walk is not a transactional snapshot, and no consistency beyond that is claimed.

## 6. Revisions and stale reads

A revision counter is maintained by database triggers on insert, update **and delete** across challenges, challenge tasks, canonical simulation activities and activity-challenge mappings. There is one global revision and one per source. Deletions and mapping changes therefore move the numbers; a timestamp maximum would not have caught them.

Compare the `revision` from `/capabilities` (or from your last read) against the value on a later response: a stored read carrying a lower revision is stale and should be re-fetched rather than trusted. `/sources` also returns `sourceVersion` per source so a single game can be refreshed on its own.

## 7. Browser use

CORS is restricted to an approved-origin allowlist maintained in the platform admin area. Allowed request headers are `Authorization`, `Content-Type`, `X-Studio-Contract` and `apikey`. Requests from an origin that is not on the list receive no `Access-Control-Allow-Origin` header and are blocked by the browser. Send the origin(s) Studio will call from so they can be added.

## 8. Read-only boundary

Catalog routes accept GET only. No write, submit or state-change route exists on this surface; Studio submissions remain a separate, future contract. Service-role access is constructed inside the backend function after the credential check and is never exposed to a client.
