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
- Wrapper envelope (signed body): `{ event_type, payload, timestamp }`

### HMAC contract (academy receiver)

| Field | Value |
|---|---|
| Header | `X-Play-Signature` |
| Algorithm | HMAC-SHA256, lowercase hex |
| Signed bytes | the **raw request body** (the envelope JSON above) |
| Secret | `PLAY_WEBHOOK_SECRET` (env) — shared with academy out-of-band |
| Companion header | `X-FGN-Event: challenge_completion` |

Receiver rollout: **shadow → lenient → strict**. Academy is currently in unsigned/shadow mode; flip strict 48h after clean matches.

For non-academy targets, the dispatcher falls back to the legacy `X-FGN-Signature` header signed with each row's `secret_key`.

## Subscribing the academy receiver

Insert a row into `ecosystem_webhooks` (the `secret_key` column is ignored for `fgn_academy` — `PLAY_WEBHOOK_SECRET` is used instead):

```sql
insert into public.ecosystem_webhooks
  (target_app, event_type, webhook_url, secret_key, is_active)
values
  ('fgn_academy', 'challenge_completion',
   'https://fgn.academy/api/ecosystem/challenge-completed',
   'unused-see-PLAY_WEBHOOK_SECRET', true);
```

Until that row exists and `is_active = true`, `live`/`shadow` dispatches will no-op with `dispatched: 0`.
