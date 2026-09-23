# Studio read API — verification report

Date: 2026-09-23. Contract version 2026-09-23.1.
Base URL: `https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/studio-api`

Run against the live endpoint with two throwaway credentials, both deleted afterwards:

- **Key A** — organization HCTC, capabilities `catalog:read`, `activities:read`, `relationships:read`, inactive records visible, 500 req/min.
- **Key B** — organization Adams Fiber, capability `catalog:read` only, inactive records hidden, 5 req/min.

| # | Check | Result |
| --- | --- | --- |
| 1 | No credential | 401 |
| 2 | Invalid credential | 401 |
| 3 | Valid credential | 200, organization reported as HCTC with its capability list |
| 4 | Missing `X-Studio-Contract` | 409, supported versions listed, no data |
| 5 | Wrong contract version | 409 |
| 6 | POST on a catalog route | 405 (read-only boundary holds) |
| 7 | Key A asking for Adams Fiber's organization id | 403, "Credential is not scoped to the requested organization" |
| 8 | Key B calling `/activities` | 403, "Credential lacks capability activities:read" |
| 9 | Token exchange | 200, `fgnt_` token, 15-minute expiry, organization and capabilities carried over |
| 10 | Token used on a catalog route | 200 |
| 11 | Token used to mint another token | 401 (only durable keys may exchange) |
| 11a | `POST /token` with an `Origin` header, no credential | 403, "Token exchange is server-only…" (refused before the credential is examined) |
| 11b | `POST /token` with a **valid durable key** and `Origin: https://studio.fgn.gg` (the allowlisted origin) | 403 — a browser cannot exchange a key even from an approved origin |
| 11c | `POST /token` with the same valid key and **no** `Origin` header | 200, token issued — legitimate server-to-server exchange unaffected |
| 11d | Catalog read with `Origin: https://studio.fgn.gg` | 200 — browser catalog reads still work; only the exchange is server-only |
| 12 | Challenge content | description present (382 chars on the sampled row), 5 fully expanded task objects with stable id, title, description, order, verification type and version |
| 13 | Inactive visibility | Key A: 127 challenges, 13 inactive and flagged. Key B: 114 challenges, 0 inactive, `includesInactiveRecords: false` stated in the payload |
| 14 | Pagination to exhaustion | 13 pages at limit 10, 127 ids, 127 unique, no duplicates, `nextCursor` null only at the end |
| 15 | Replayed cursor | Returns the identical page; strict keyset ordering means no loop |
| 16 | Interrupted walk | Still carries a `nextCursor`, so an incomplete read is detectable rather than looking like a short list |
| 17 | Tampered cursor | 400, "Cursor signature invalid" |
| 18 | Cursor reused on a different query | 400, rejected |
| 19 | Cursor reused by another organization | 400, rejected |
| 20 | Activities and lookup by id | 5 activities listed with variant challenge ids; single-id lookup 200 |
| 21 | Relationships | 200, includes the authority note that FGN Academy owns its own work-order definitions |
| 22 | Revision on insert | global and per-source revision 1 → 2 |
| 23 | Revision on update | 2 → 3 |
| 24 | Revision on **delete** | 3 → 4 (a timestamp maximum would have missed this) |
| 25 | Stale read mid-walk | Catalog changed between pages; the next page returned `revisionChanged: true` |
| 26 | Rate limiting | Key B (cap 5/min): requests 1–5 → 200, requests 6–7 → 429 |
| 27 | Revoked key | 401, "Credential revoked" |
| 28 | Token issued before revocation | 401 immediately after the key was revoked |
| 29 | CORS from an unapproved origin | Preflight answered without `Access-Control-Allow-Origin`, so the browser blocks the call |

Harness rows (one temporary inactive challenge, used for the revision checks) were deleted, and both verification keys were deleted at the end of the run. No player-facing record was modified, and no existing ecosystem consumer was touched.
