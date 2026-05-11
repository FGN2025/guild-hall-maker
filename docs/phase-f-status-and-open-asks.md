# To: play.fgn.gg devs — Phase F status + asks still open

## Status (Academy side, no action needed from you)

- **Phase F shipped on Academy** (`vfzjfkcwromssjnlrhoo`). Track membership is now table-driven (`challenge_tracks` + `challenge_track_membership`), with per-track `gate_mode` (`per_challenge` vs `all_completed`), accent color, icon, and course/lesson resolution.
- **End-to-end smoke test green:**
  - 1× Fiber (`per_challenge`) fires `knowledge_check_available` immediately.
  - 4× OSHA (`all_completed`) holds the track-complete notification until the 4th completion, then fires **Track Complete: OSHA Safety Overlay**.
- **Your payload contract didn't change.** `sync-to-academy` keeps forwarding the same bytes; we derive track/course/lesson/gate on our side from `challenge_id`. No coordination needed for Phase F.

## Asks still open from plan v3 §3

1. **`metadata.external_attempt_id`** — ✅ **SHIPPED (PR P-3, May 2026).** Stable per-enrollment uuid backed by `challenge_enrollments.external_attempt_id` (unique, defaulted via `gen_random_uuid()`). Safe to use as a hard idempotency key.
2. **`metadata.external_user_id`** — ✅ **SHIPPED (PR P-3, May 2026).** Sent on every `challenge_completion` push. Safe to key `play_identity` on it.
3. **PR P-2 rollout window** — still open. How long do we accept both `X-App-Key` and `X-Ecosystem-Key` before hard-failing legacy? We proposed **14 days**.
4. **PR P-3 tenant fields** — ✅ **SHIPPED (May 2026).** Final shape: `metadata.tenant_id` (uuid \| null), `metadata.tenant_slug` (string \| null), `metadata.tenant_name` (string \| null). All three are `null` for staff/unaffiliated users.
5. **Webhook HMAC scheme** (for Phase E receiver) — still open. Header name + canonical string format when you're ready.

## Heads-up (not a blocker)

OSHA challenges don't have work orders in your prod feed — we seeded **4 stub work orders** on Academy mapped to those challenge IDs to enable the smoke test. If you ever publish real OSHA work orders on play with the same `source_challenge_id`s:

- `452f8199…`
- `7c7ae072…`
- `bcb4a446…`
- `d098fcac…`

…our seeded rows will collide on the unique index. **Ping us before you do** and we'll swap them out.
