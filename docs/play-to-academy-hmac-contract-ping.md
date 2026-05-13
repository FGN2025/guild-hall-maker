# Async Note → Academy Team: HMAC Contract for Play → Academy Webhooks

**From:** Play (play.fgn.gg)
**To:** Academy (fgn.academy) on-call + integrations
**Date:** 2026-05-13
**Subject:** HMAC signing contract for `challenge_completion` and `evidence.approved` webhooks — ready for you to verify against
**Related:** `docs/phase-e-routing-flag.md`, `docs/phase-e-strict-cutover-2026-05-26.md`, `docs/fgn-academy-integration.md` §6/§10

---

## TL;DR

Play has been signing every outbound webhook to Academy with HMAC-SHA256 since Phase E went live (2026-05-12 ~16:22 UTC). We're in the 48h parity window, on track for the §8 strict cutover on **2026-05-26 16:00 UTC**. This note is the full signing contract so your receiver can move from lenient → strict on schedule, and so `evidence.approved` (Phase F #4, shipped today) verifies cleanly the moment you flip on signature checks.

No action required from Play once you've confirmed signature parity on a sample event. Reply in #ecosystem-ops with the `play_secret_sha256[:12]` you compute from your copy of `PLAY_WEBHOOK_SECRET` so we can byte-compare without either side leaking the value.

---

## 1. Transport

| Field | Value |
|---|---|
| Method | `POST` |
| Content-Type | `application/json` |
| Dispatcher (Play side) | `supabase/functions/ecosystem-webhook-dispatch` |
| Target row | `ecosystem_webhooks` where `target_app = 'fgn_academy'` AND `is_active = true` |
| Routing flag | `PHASE_E_ROUTING_MODE` (Play-side secret): `off` / `shadow` / `live`. Currently `live`. |

---

## 2. Headers (every Academy-bound dispatch)

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | |
| `X-Ecosystem-Key` | value of `ECOSYSTEM_API_KEY` | Sole accepted auth header post §8 cutover. `X-App-Key` is retired on Play side already. |
| `X-Play-Signature` | lowercase hex HMAC-SHA256 of the raw request body | See §4. |
| `X-FGN-Event` | event type, e.g. `challenge_completion`, `evidence.approved`, `passport_magic_link` | |
| `X-Delivery-Id` | UUID per delivery | PR P-3. Use as your idempotency key. |
| `X-Play-Delivery-Id` | same UUID, dual-emitted | Transitional; will drop after you confirm `X-Delivery-Id` is wired in. |

---

## 3. Body envelope

The signed bytes are the **exact raw request body** — this JSON, serialized once on Play side, never re-serialized:

```json
{
  "event_type": "challenge_completion",
  "payload": { /* event-specific, see §5 */ },
  "delivery_id": "1f9c…-uuid",
  "timestamp": "2026-05-13T18:42:11.034Z"
}
```

Important: do **not** re-`JSON.stringify` the parsed body before verifying. Sign/verify against the raw bytes received off the wire. Key ordering, whitespace, and number formatting are whatever `JSON.stringify` produced on Play side; verifying against a re-serialized version will fail.

---

## 4. Signature computation

```
algorithm     : HMAC-SHA256
encoding      : lowercase hex
secret        : PLAY_WEBHOOK_SECRET   (shared, env, rotated out-of-band)
signed bytes  : raw request body (the envelope JSON above, exactly as transmitted)
header        : X-Play-Signature
```

Reference (Deno, what Play actually runs — from `ecosystem-webhook-dispatch/index.ts`):

```ts
async function hmacSign(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

Node 20+ equivalent for your receiver:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody: Buffer, headerSig: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(headerSig, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Use a constant-time compare (`timingSafeEqual`). Reject on length mismatch before comparing.

### Secret-fingerprint diagnostic

Both sides should log a short fingerprint of their copy of `PLAY_WEBHOOK_SECRET` so we can disambiguate stale values without leaking the secret. Play emits this on every passport-link call already:

```
[passport-link] play_secret_sha256[:12]=<12hex> secret_len=<n> sig_prefix=<8hex> body_len=<n>
```

Please post your `play_secret_sha256[:12]` + `secret_len` in #ecosystem-ops. They must match Play's, which we'll DM at the same time.

---

## 5. Event payloads

### 5.1 `challenge_completion` (Phase E, live)

Inner `payload`:

```json
{
  "user_email": "player@example.com",
  "challenge_id": "uuid",
  "score": 92,
  "task_progress": { /* per-task booleans/scores */ },
  "skills_verified": ["routing-fundamentals", "splice-prep"],
  "metadata": {
    "delivery_id": "1f9c…-uuid",
    "tenant_slug": "fgn",
    "completed_at": "2026-05-13T18:42:00.000Z"
  }
}
```

Idempotency key: envelope `delivery_id` (top-level), mirrored in `metadata.delivery_id`. Same UUID is in `X-Delivery-Id` header.

### 5.2 `evidence.approved` (Phase F #4, shipped 2026-05-13)

Inner `payload`:

```json
{
  "user_email": "player@example.com",
  "evidence_id": "uuid",
  "challenge_id": "uuid",
  "approved_by": "uuid",
  "approved_at": "2026-05-13T18:42:00.000Z",
  "skills_verified": ["fiber-splice"],
  "evidence_url": "https://…/evidence/…",
  "metadata": {
    "delivery_id": "…-uuid",
    "tenant_slug": "fgn"
  }
}
```

Receiver behavior on Play side mirrors `achievement.earned`: resolve identity → ensure passport → upsert a `play_evidence` skill_verification credential, idempotent on `(passport_id, external_reference_id)` via a unique partial index. Your receiver should be free to apply the same upsert pattern keyed on `delivery_id` or `evidence_id`.

### 5.3 `passport_magic_link` (dormant; activated only when `passport_link_mode = 'magic_link'`)

Body is the canonical payload itself (no envelope wrapper) — `academy-passport-link` signs the canonical JSON directly. Same headers, same algorithm. Documented here for completeness; not part of the §8 cutover scope.

---

## 6. Failure modes & expected responses

| Receiver scenario | Expected HTTP | Play behavior |
|---|---|---|
| Valid signature, processed | `2xx` | logs `status=success` in `ecosystem_sync_log` |
| Invalid signature (post-cutover, strict) | `401` | logs `status=failed`, `error_message="HTTP 401"`. **No retry from Play side** in current dispatcher — we'll alert in #ecosystem-ops and either roll Academy back to lenient or fix Play signing via `PHASE_E_ROUTING_MODE=shadow`. |
| Missing `X-Ecosystem-Key` (post-cutover) | `401` | same |
| Duplicate `delivery_id` | `200` (idempotent no-op) preferred, or `2xx` of your choice | Play does not retry, but Academy may receive replays during shadow windows; please dedupe. |
| Transient 5xx | `5xx` | logged; no automatic retry today (open ask if you want one). |

---

## 7. Cutover schedule (Academy actions)

Per `docs/phase-e-strict-cutover-2026-05-26.md`:

- **T-24h (2026-05-25 16:00 UTC)** — Play posts 7-day parity stats in #ecosystem-ops. Confirm Academy on-call.
- **T0 (2026-05-26 16:00 UTC)** — Academy flips receiver to strict: unsigned/bad-sig → 401, missing `X-Ecosystem-Key` → 401.
- **T0 → T0+2h** — both sides watch logs in 15-min cadence.
- **T0+7d** — done criteria: ≥99% success rate, zero rollbacks, zero unsigned-reject log entries from Play traffic. Play retires `FGN_ACADEMY_API_KEY` secret.

Rollback path is Academy-side only (revert to lenient). Play is already strict-only on send; the only Play-side fallback is `PHASE_E_ROUTING_MODE=shadow` if we ship a signing bug.

---

## 8. Asks back to Academy

1. **Confirm secret fingerprint match** (`play_secret_sha256[:12]` + `secret_len`) — post in #ecosystem-ops in next 48h.
2. **Confirm receiver accepts `evidence.approved`** with the §5.2 payload shape, or flag schema deltas before §8.
3. **Confirm idempotency strategy** on your side (we recommend `delivery_id` from header `X-Delivery-Id`).
4. **Confirm on-call name + escalation** for the 2026-05-26 16:00 UTC flip window.

Reply in #ecosystem-ops or DM. Thanks — we're green on our side and ready to support the cutover.
