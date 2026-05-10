# To: play.fgn.gg devs — Phase F status + asks still open

## Status (Academy side, no action needed from you)

- **Phase F shipped on Academy** (`vfzjfkcwromssjnlrhoo`). Track membership is now table-driven (`challenge_tracks` + `challenge_track_membership`), with per-track `gate_mode` (`per_challenge` vs `all_completed`), accent color, icon, and course/lesson resolution.
- **End-to-end smoke test green:**
  - 1× Fiber (`per_challenge`) fires `knowledge_check_available` immediately.
  - 4× OSHA (`all_completed`) holds the track-complete notification until the 4th completion, then fires **Track Complete: OSHA Safety Overlay**.
- **Your payload contract didn't change.** `sync-to-academy` keeps forwarding the same bytes; we derive track/course/lesson/gate on our side from `challenge_id`. No coordination needed for Phase F.

## Asks still open from plan v3 §3 (unchanged, just re-flagging)

1. **`metadata.external_attempt_id`** — per-attempt UUID stable across retries. Without it our `play_sync_attempts` idempotency key is best-effort. **Status?**
2. **`metadata.external_user_id`** — confirm it's on every push once PR **P-3** lands (we key `play_identity` on it).
3. **PR P-2 rollout window** — how long do we accept both `X-App-Key` and `X-Ecosystem-Key` before hard-failing legacy? We proposed **14 days**.
4. **PR P-3 tenant fields** — confirm shape: `metadata.tenant_id` (uuid), `metadata.tenant_slug`, `metadata.tenant_name`.
5. **Webhook HMAC scheme** (for Phase E receiver) — header name + canonical string format when you're ready.

## Heads-up (not a blocker)

OSHA challenges don't have work orders in your prod feed — we seeded **4 stub work orders** on Academy mapped to those challenge IDs to enable the smoke test. If you ever publish real OSHA work orders on play with the same `source_challenge_id`s:

- `452f8199…`
- `7c7ae072…`
- `bcb4a446…`
- `d098fcac…`

…our seeded rows will collide on the unique index. **Ping us before you do** and we'll swap them out.
