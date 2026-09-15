# Merit Connector: fgn.gg side of Scout Merit Builder Stop 7

## Context

[Scout Merit Builder](/projects/703a58c3-1f5d-41ea-b155-4b574979e185) (companion app) is blocked on Stop 7 — it is waiting for a `merit-connector.openapi.yaml` contract. This project already has the pieces it will connect to:

- `ecosystem-data-api` — the challenge catalogue the companion already pulls with `X-Ecosystem-Key` + `X-Ecosystem-App: merit`.
- `ecosystem-webhook-dispatch` — envelope `{event_type, payload, delivery_id, timestamp}` with HMAC signing (`X-FGN-Signature`, per-row secret) and `X-Delivery-Id`.
- `dispatch_marketing_webhook()` — the established trigger → `net.http_post` → vault secret → dispatcher pattern.
- Merit schema in this project: `official_badges` (keyed by `slug`), `merit_pathways`, `merits`, `merit_challenges`, `player_merit_progress`, `advancement_records` (digital / external-recording / physical states), `passport_refresh_pending` → Academy Skill Passport sync.

Auth decision (user-selected): the existing static **ecosystem key** pattern (`X-Ecosystem-Key` against `ECOSYSTEM_API_KEY`), same as fgn.academy.

## What gets built

### 1. The contract — `merit-connector.openapi.yaml`

OpenAPI 3.1 spec covering both directions, written to `docs/` in this repo and copied to `/mnt/documents/` for handoff to the companion project:

- **Inbound challenge webhooks (fgn.gg → companion).** The companion exposes `POST /webhooks/fgn-challenges`. Envelope and headers exactly match `ecosystem-webhook-dispatch`: `X-FGN-Signature` (HMAC-SHA256 lowercase hex over the raw body, shared signing secret), `X-Delivery-Id`. Event types: `challenge.created`, `challenge.updated`, `challenge.deactivated`. Receiver rules: 2xx ack, dedupe on `delivery_id`.
- **Outbound passport entries (companion → fgn.gg).** `POST /functions/v1/merit-connector-api` with `X-Ecosystem-Key` + `X-Ecosystem-App: merit`. Actions: `health`, `passport_entries`, plus a `validate_only` mode for payload checks without writes.

### 2. Receiver edge function — `merit-connector-api`

New `supabase/functions/merit-connector-api/index.ts`:

- CORS per standards; ecosystem-key auth (`X-Ecosystem-Key` vs `ECOSYSTEM_API_KEY`); app name must be `merit`.
- Zod-validated body. `passport_entries` accepts a batch: `{ delivery_id, entries: [{ external_user_id | user_email, badge_slug, completed_at, decided_by_email?, note?, source }] }`.
- Per entry: resolve the fgn.gg user (id, else email via admin lookup), resolve `official_badges` by `slug`, then upsert `advancement_records`: set `digital_completed_at`, `recorded_externally_at`, append note with the source app. Idempotent replays via a new `merit_connector_deliveries` table keyed on `delivery_id`.
- After accepted entries, enqueue `passport_refresh_pending` for each affected user so the existing debounced machinery pushes the Skill Passport update to fgn.academy.
- Per-entry results returned (`accepted` / `failed` with reasons); every call logged to `ecosystem_sync_log` with `target_app='scout_merit_builder'`.

### 3. Outbound challenge events

Migration adds `dispatch_merit_challenge_webhook()` — a copy of the proven `dispatch_marketing_webhook()` pattern (fires on `challenges` INSERT/UPDATE, `net.http_post` to `ecosystem-webhook-dispatch` using the vault-stored `ecosystem_dispatch_secret`, failures swallowed as warnings so challenge writes never roll back). Emits `challenge.created` / `challenge.updated` / `challenge.deactivated` (when `is_active` flips false) with id, name, game, difficulty, active flag, and `updated_at`.

### 4. Wiring up (needs one input from you)

Dispatch only delivers once an `ecosystem_webhooks` row exists for the new event types pointing at the companion's webhook URL with a shared signing secret. The companion hasn't built its receiver yet, so: the migration and dispatch plumbing ship ready, and the row gets added when the companion gives us its webhook URL. The signing secret is one you create (e.g. `openssl rand -hex 32`) and share with the companion — saved via the secure form, never in code.

## Verification

- Deploy and curl `merit-connector-api`: `health` OK, wrong/missing key → 401, malformed payload → 400, `validate_only` → payload verdict without any write.
- Replay the same `delivery_id` → duplicate rejected, no second write.
- Trigger a challenge update on a harness row → confirm the dispatcher receives the event (webhook row absent → `dispatched: 0`, which proves the plumbing fired).
- Migration runs idempotently (ON CONFLICT DO NOTHING); new table gets GRANTs and service-role-only RLS.

## Out of scope

- Building the companion's receiver, the app's Stops 4–6, or its catalogue mappings — those live in the companion project.
- Any change to approved marketing posts, dispatch queue, kill switch, or role boundaries.
