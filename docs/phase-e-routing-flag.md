# Phase E Routing — Reversible Feature Flag

## What it does

`sync-to-academy` (play.fgn.gg → academy) chooses one of three transports based on the `PHASE_E_ROUTING_MODE` edge-function secret:

| Mode | Transport | Authoritative response | Reversible? |
|---|---|---|---|
| `off` (default) | Direct POST to `academyUrl` with `X-Ecosystem-Key` (Phase D) | Direct POST | n/a |
| `shadow` | Direct POST **and** HMAC-signed `ecosystem-webhook-dispatch` | Direct POST | flip back to `off` instantly |
| `live` | HMAC-signed `ecosystem-webhook-dispatch` only | Dispatch result | flip back to `shadow` or `off` instantly |

No code redeploy required to change modes — just update the secret.

## How to flip

1. Set / update secret `PHASE_E_ROUTING_MODE` in Lovable Cloud → Edge Functions → Secrets.
2. Value is read per-invocation; takes effect on the next sync call.
3. To revert: set back to `off` (or delete the secret).

## Recommended rollout

1. **`shadow`** for 24–48h. Watch `ecosystem_sync_log` for rows with `data_type = 'webhook:challenge_completion'` — confirm parity with the direct-POST rows.
2. **`live`** once parity holds and the academy receiver confirms HMAC verification on its side.
3. Keep `off` available as the instant kill switch.

## What gets dispatched in Phase E

- Function: `ecosystem-webhook-dispatch`
- Event type: `challenge_completion`
- Payload: identical to the Phase D direct-POST body (same `user_email`, `challenge_id`, `score`, `task_progress`, `skills_verified`, `metadata`)
- Headers added by dispatcher: `X-FGN-Signature` (HMAC-SHA-256 hex of body using each subscriber's `secret_key`), `X-FGN-Event: challenge_completion`
- Wrapper envelope: `{ event_type, payload, timestamp }` (signed string is the full envelope JSON)

## Subscribing the academy receiver

Insert a row into `ecosystem_webhooks`:

```sql
insert into public.ecosystem_webhooks
  (target_app, event_type, webhook_url, secret_key, is_active)
values
  ('fgn_academy', 'challenge_completion',
   'https://fgn.academy/api/ecosystem/challenge-completed',
   '<shared HMAC secret>', true);
```

Until that row exists and `is_active = true`, `live`/`shadow` dispatches will no-op with `dispatched: 0`.
