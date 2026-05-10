# FGN Academy ↔ play.fgn.gg Integration Contract

This document describes how **FGN Academy** consumes data from **play.fgn.gg** to issue and track work orders, badges, and player progress.

The integration is **pull-based**: Academy polls the play.fgn.gg ecosystem API on its own schedule. play.fgn.gg does not push data to Academy automatically (a manual "Sync to Academy" button exists in the admin Challenges UI for one-off pushes).

---

## 1. Authentication

All requests require the shared secret header:

```
X-Ecosystem-Key: <ECOSYSTEM_API_KEY>
```

Optional header for attribution in sync logs:

```
X-Ecosystem-App: academy
```

The key is stored as a backend secret on play.fgn.gg. Contact a platform administrator to obtain or rotate it.

---

## 2. Endpoint

```
POST https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/ecosystem-data-api
Content-Type: application/json
X-Ecosystem-Key: <key>
X-Ecosystem-App: academy
```

All actions are dispatched via the JSON body's `action` field.

---

## 3. Available Actions

| Action | Purpose | Optional params |
|---|---|---|
| `health` | Liveness + DB + Academy key probe | — |
| `challenges` | Challenge templates + tasks (work-order source) | `since`, `limit` |
| `quests` | Quest templates | `since`, `limit` |
| `tournaments` | Tournament list | `since`, `limit` |
| `tenant-events` | Public tenant events | `since`, `limit` |
| `player-progress` | A single user's enrollments, evidence, completions | `user_id` (**required**), `limit` |
| `achievements` | Earned player badges | `user_id`, `since`, `limit` |
| `season-stats` | Active season scoreboard | `user_id`, `limit` |

**Limit cap:** server enforces `min(limit, 500)`, default `100`.
**`since`:** ISO 8601 timestamp; filters by `updated_at` (or `awarded_at` for achievements).

---

## 4. Recommended Polling Cadence (Academy side)

| Data | Cadence | Notes |
|---|---|---|
| `challenges` | Every 15 min | Use `since` to fetch deltas. New/updated challenges become work-order templates. |
| `player-progress` | Every 5 min for active learners; on-demand at session start | Per-user pull keyed by Academy's user_id mapping. |
| `achievements` | Every 30 min | Use `since`; renders as badge ribbons. |
| `season-stats` | Hourly | Used for cohort dashboards. |
| `health` | Every 5 min | Pager on `degraded`. |

---

## 5. Response Shape

All successful responses:

```json
{ "data": <action-specific payload> }
```

Errors:

```json
{ "error": "human-readable message" }
```

with HTTP status codes 400 (bad action / missing required field), 401 (auth), 500 (server).

---

## 6. Sync Log Visibility

Every successful API call writes a row to `ecosystem_sync_log` (data_type, target_app, records_synced, status). Platform admins can view aggregate health under **Admin → Ecosystem → Sync Health**.

---

## 7. Push Roadmap (Deferred)

Real-time event push from play.fgn.gg → Academy is **not yet active**. Planned future events:

- `challenge.completed` — fires when a player completes a challenge
- `evidence.approved` — fires when evidence is approved
- `achievement.earned` — fires on badge unlock

Webhook infrastructure (`ecosystem_webhooks`, `ecosystem-webhook-dispatch`) is already in place. Subscribe by registering Academy's webhook URL in **Admin → Ecosystem → Outbound Webhooks**.

Until push is enabled, Academy should rely on `since`-filtered polls of `player-progress` and `achievements` to detect new activity.

---

## 8. Manual Push (Today)

Admins can trigger a one-off sync of a specific challenge completion to Academy via the **Admin → Challenges** UI. This invokes the `sync-to-academy` edge function, which posts to Academy with the `X-Ecosystem-Key` header (backed by the `ECOSYSTEM_API_KEY` secret). This is the only push path currently active.

---

## 9. Contact

For key rotation, integration questions, or to request the push roadmap to be prioritized, contact the platform administrators.

---

## 10. Header Migration (Completed)

The integration previously supported a legacy `X-App-Key` header (backed by `FGN_ACADEMY_API_KEY`). As of P-3, the cutover is complete: `sync-to-academy` sends only `X-Ecosystem-Key` (backed by `ECOSYSTEM_API_KEY`), and the `FGN_ACADEMY_API_KEY` secret has been retired.
