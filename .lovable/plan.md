# Make `tenant.marketing.created` webhooks real for the external agent (Grok)

## Assessment of the provided instructions

- The INSERT statement is valid and safe: columns match `ecosystem_webhooks` exactly, `is_active` boolean, `target_app` is free text so `grok_cos` works.
- The admin UI refresh step works — the row will show as Active.
- **Fatal gap:** nothing in Play emits `event_type = 'tenant.marketing.created'`. The existing triggers on `marketing_campaigns` and `tenant_marketing_assets` (`trg_notify_campaign_change`, `trg_notify_tenant_asset_new`) only enqueue in-app notifications. `ecosystem-webhook-dispatch` is currently only invoked by Academy sync functions. Following the instructions as written produces a configured webhook that never fires.
- Receiver contract Grok must implement: verify `X-FGN-Signature` = lowercase-hex HMAC-SHA256 of the **raw request body** keyed by the webhook `secret_key` (the "Webhook key" from the routine). Headers sent: `X-FGN-Event`, `X-Delivery-Id`, `X-Play-Delivery-Id`. Body envelope: `{ event_type, payload, delivery_id, timestamp }`.
- Dispatcher has no retry — failed deliveries are only logged in `ecosystem_sync_log`.

## What to build

### 1. Emit the event from the database (migration)

Add a trigger function that fires when agent-created marketing content is created or changes state, and POSTs to the dispatcher using the established `net.http_post` + vault-secret pattern (same as `email_queue_wake`):

- New function `public.dispatch_marketing_webhook()`:
  - On `marketing_campaigns` INSERT or status change, and `tenant_marketing_assets` INSERT where `agent_source IS NOT NULL`.
  - Calls `net.http_post` to `…/functions/v1/ecosystem-webhook-dispatch` with `Authorization: Bearer <ECOSYSTEM_DISPATCH_SECRET>` read from `vault.decrypted_secrets` (store it under a vault name like `ecosystem_dispatch_secret`, mirroring `email_queue_service_role_key`).
  - Body: `{ "event_type": "tenant.marketing.created", "tenant_id": NEW.tenant_id, "payload": { "kind": "campaign"|"asset", "id", "tenant_id", "title/label", "status", "agent_source", "created_at" } }`.
  - Wrapped in `EXCEPTION WHEN OTHERS THEN RAISE WARNING` so a webhook failure can never roll back a marketing write.
- New triggers: `marketing_campaigns_webhook` (AFTER INSERT OR UPDATE OF status) and `tenant_marketing_assets_webhook` (AFTER INSERT).
- Fire only for meaningful transitions: INSERT with any status, and UPDATE where `status` actually changes (created → review → approved → published). Event types: keep `tenant.marketing.created` for INSERTs; optionally also emit `tenant.marketing.status_changed` for status transitions so Grok can track the funnel. Confirm scope at approval time.

### 2. Store the dispatch secret in the vault (one SQL statement)

- `SELECT vault.create_secret('<value of ECOSYSTEM_DISPATCH_SECRET>', 'ecosystem_dispatch_secret');`
- Verify the edge-function secret `ECOSYSTEM_DISPATCH_SECRET` exists (it is already referenced by the dispatcher; confirm via secrets list).

### 3. Register the Grok webhook (the user's SQL, unchanged)

- Run the provided INSERT with the real Webhook URL/key from the Grok routine.
- Keep `is_active = false` until step 4 verification passes, then flip to true — avoids Grok receiving unsigned-era test noise.

### 4. Verify end-to-end

- Insert a throwaway `marketing_campaigns` row on a scratch tenant (never Acme), confirm:
  - a row appears in `ecosystem_sync_log` with `data_type = 'webhook:tenant.marketing.created'` and `status = 'success'`;
  - Grok's routine received the POST and signature verification passed.
- Roll back / delete the scratch row.

### 5. Document the receiver contract

- Add a short section to `docs/play-fgn-gg-integration-guide.md`: envelope shape, `X-FGN-Signature` HMAC verification snippet (Node), idempotency on `X-Delivery-Id`, and the no-retry caveat.

## Out of scope

- No changes to approvals, dispatch of scheduled posts, kill switch, or Acme data.
- No retry machinery for the dispatcher (separate decision if Grok needs guaranteed delivery).
- No changes to the Academy HMAC contract.

## Technical details

- Files: new migration (trigger function + triggers), `docs/play-fgn-gg-integration-guide.md`.
- Existing pieces reused: `ecosystem-webhook-dispatch` (auth via `ECOSYSTEM_DISPATCH_SECRET` Bearer), `net.http_post` + `vault.decrypted_secrets` pattern from `email_queue_wake`, `ecosystem_sync_log` for observability.
- Security: trigger function is `SECURITY DEFINER` with `SET search_path = public`; webhook failures are swallowed as warnings; secret never leaves the vault.
