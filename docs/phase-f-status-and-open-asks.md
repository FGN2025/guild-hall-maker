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
3. **PR P-2 rollout window** — ✅ **CONFIRMED 14 days (2026-05-11).** Academy proposed 14 days from cutover for dual-accept `X-App-Key` / `X-Ecosystem-Key`; Play accepts. Schedule the strict-mode flip on day 15 post-cutover; we'll cut all outbound calls over to `X-Ecosystem-Key` before then. Ping us on the cutover date so we can mark T0 in our log.
4. **PR P-3 tenant fields** — ✅ **SHIPPED (May 2026).** Final shape: `metadata.tenant_id` (uuid \| null), `metadata.tenant_slug` (string \| null), `metadata.tenant_name` (string \| null). All three are `null` for staff/unaffiliated users.
5. **Webhook HMAC scheme** (for Phase E receiver) — ✅ **FINALIZED 2026-05-10.** Header `X-Play-Signature`, HMAC-SHA256 lowercase hex over the raw request body, secret `PLAY_WEBHOOK_SECRET`. Companion header `X-FGN-Event: challenge_completion`. Implemented in `ecosystem-webhook-dispatch`. Awaiting rotated `PLAY_WEBHOOK_SECRET` from Academy via OneTimeSecret to flip `PHASE_E_ROUTING_MODE` from `off` → `shadow`. Webhook row already inserted (`fgn_academy` / `challenge_completion` / active).

## Heads-up (not a blocker)

OSHA challenges don't have work orders in your prod feed — we seeded **4 stub work orders** on Academy mapped to those challenge IDs to enable the smoke test. If you ever publish real OSHA work orders on play with the same `source_challenge_id`s:

- `452f8199…`
- `7c7ae072…`
- `bcb4a446…`
- `d098fcac…`

…our seeded rows will collide on the unique index. **Ping us before you do** and we'll swap them out.

---

## Update — skills taxonomy (Play side, May 2026)

### What changed
`skills_verified` on `challenge_completion` payloads is now a curated list of **competency tags** instead of `difficulty:*` / `game:*` placeholders. Field name and shape (`string[]`) are unchanged — **no contract break**.

Examples:
```json
"skills_verified": ["osha:fall-protection", "osha:ppe", "difficulty:intermediate"]
"skills_verified": ["cdl:pre-trip", "cdl:hazard-perception", "difficulty:advanced"]
"skills_verified": ["fiber:splicing", "fiber:otdr", "difficulty:beginner"]
```

### Tag format
- Lowercase, namespace-prefixed: `<namespace>:<skill>`
- Initial namespaces: `cdl:`, `osha:`, `fiber:`, `gaming:`
- `difficulty:<level>` is always appended as a secondary metadata-style tag

### Fallback behavior
Challenges that have **not** been re-tagged yet still emit the legacy triple (`game:<name>`, `gaming-proficiency`, `difficulty:<level>`). Expect a mix of curated and legacy payloads during the rollout window — no flag day.

### Source of truth
Living list in `src/lib/skillTaxonomy.ts` on Play. We commit to namespace-prefixed lowercase tags. Please key any Skill Passport mappings on the **prefix** so unknown skills in a known namespace fail open instead of being dropped.

### Full taxonomy snapshot (v1, May 2026)

Copy-pasteable. Source: `src/lib/skillTaxonomy.ts`.

**`cdl:` — Commercial Driving (FMCSA 49 CFR 383)**
| Tag | Label |
|-----|-------|
| `cdl:pre-trip` | Pre-Trip Inspection |
| `cdl:backing` | Backing & Parking |
| `cdl:speed-management` | Speed Management |
| `cdl:logbook` | Hours of Service / Logbook |
| `cdl:hazard-perception` | Hazard Perception |
| `cdl:fuel-mgmt` | Fuel Management |
| `cdl:cargo-securement` | Cargo Securement |
| `cdl:hazmat-awareness` | Hazmat Awareness |

**`osha:` — Workplace Safety (OSHA 10/30)**
| Tag | Label |
|-----|-------|
| `osha:fall-protection` | Fall Protection |
| `osha:ppe` | Personal Protective Equipment |
| `osha:lockout-tagout` | Lockout / Tagout |
| `osha:hazcom` | Hazard Communication |
| `osha:electrical-safety` | Electrical Safety |
| `osha:ladder-safety` | Ladder & Scaffold Safety |
| `osha:confined-space` | Confined Space Entry |

**`fiber:` — Broadband Tech (OSP / ISP)**
| Tag | Label |
|-----|-------|
| `fiber:splicing` | Fusion Splicing |
| `fiber:otdr` | OTDR Testing |
| `fiber:installation` | Installation & Drop |
| `fiber:troubleshooting` | Troubleshooting |
| `fiber:termination` | Connector Termination |
| `fiber:documentation` | As-Built Documentation |

**`gaming:` — Transferable Esports Skills**
| Tag | Label |
|-----|-------|
| `gaming:aim` | Aim & Mechanics |
| `gaming:strategy` | Strategy & Game Sense |
| `gaming:teamwork` | Teamwork & Communication |
| `gaming:macro` | Macro / Map Awareness |
| `gaming:micro` | Micro / Execution |
| `gaming:vod-review` | VOD Review & Adaptation |

**Always appended:** `difficulty:beginner` | `difficulty:intermediate` | `difficulty:advanced` | `difficulty:expert` (mirrors `challenges.difficulty`).

**Legacy fallback (untagged challenges only):** `game:<games.name>`, `gaming-proficiency`, `difficulty:<level>`.

### Cross-reference for Academy docs

The canonical cross-reference on Play side is **`docs/play-fgn-gg-integration-guide.md` §7 + "Skills Taxonomy (May 2026)"**. Academy mirrored §7 verbatim into their own `docs/phase-f-status-and-open-asks.md` and added the cross-links:
- Top-level: `docs/api/README.md` → single link to §7 (not duplicated per-track).
- Per-track deep-links: `cdl-quest.md` and `cdl-exchange.md` point at the `cdl:` slice + §7 anchor.
- `docs/api/public-catalog/skills.md` notes legacy game-scoped key here vs namespace-prefixed tags in cross-app payloads.
- `osha-overlay.md` / `fiber-tech.md` deferred until those integration partners ship — not blocking v1.

### Academy-side impact (confirmed 2026-05-11)
- `skill_credentials.skills_verified[]` accepts namespaced tags as-is — no schema change.
- Profile / Skill Passport renders `namespace:tag` via human-label lookup, falls back to title-cased tag for unknowns (matches our "fail open on known prefix" rule).
- `/public-catalog/skills` stays game-scoped today; adding a `namespace` field is a planned follow-up PR, not a v1 blocker.

### Asks for Academy
1. ✅ **Confirmed.** Academy accepts arbitrary `<namespace>:<skill>` tags without an allow-list update.
2. **Coordination question (still open, non-blocking):** align the canonical OSHA / CDL / Fiber tag list with Academy's `challenge_tracks.gate_mode` taxonomy now, or keep them independent for one more iteration?
3. ✅ Both follow-ups closed: PR P-2 14-day window confirmed; HMAC scheme finalized 2026-05-10. See §"Asks still open from plan v3 §3" above.

---

## Phase E flip — current state (2026-05-11)

| Prereq | Status |
|---|---|
| `ecosystem-webhook-dispatch` deployed with `X-Play-Signature` + HMAC-SHA256 | ✅ |
| `ecosystem_webhooks` row (`fgn_academy` / `challenge_completion`) active | ✅ |
| `PLAY_WEBHOOK_SECRET` set in edge-function secrets | ✅ (placeholder — awaiting Academy rotation) |
| `PHASE_E_ROUTING_MODE` | `off` (default) |

**Next step:** Academy delivers rotated `PLAY_WEBHOOK_SECRET` via OneTimeSecret → we update the secret → flip `PHASE_E_ROUTING_MODE` to `shadow` for 24–48h parity check → flip to `live`. Reversible at any time per `docs/phase-e-routing-flag.md`.



---

## §9 companion — Play-side delivery shape (2026-05-11)

Cross-references §9 (P1 BLOCKER — Skill Passport URL contract).

The Play-side link-out is now **fully config-driven**. No code change required when Academy lands on Option A or Option B — Play flips a single `tenant_integrations` row (`provider_type='fgn_academy'`, `is_active=true`).

### Knobs in `tenant_integrations.additional_config`

| Key | Type | Purpose |
|---|---|---|
| `passport_base_url` | string | Host root (default `https://fgn.academy`). |
| `passport_path_template` | string | Path with placeholders. Supported: `{email}`, `{external_user_id}`, `{slug}`. Default `/passport?email={email}` (still 404s — pending §9). |
| `passport_link_mode` | `"direct"` \| `"magic_link"` | Default `"direct"`. |
| `passport_magic_link_endpoint` | string | Required when `passport_link_mode='magic_link'`. Academy's POST endpoint that returns `{ url }`. |

### Option A activation (canonical URL)
Set `passport_path_template` to Academy's confirmed pattern, e.g.:
- `/passport/{external_user_id}`
- `/passport/{slug}` (requires Academy slug-resolution endpoint we'd need to wire separately)
- `/u/{email}/skill-passport`

### Option B activation (magic-link, preferred)
Edge function `supabase/functions/academy-passport-link` is **shipped and dormant**. It:
1. Verifies caller via `Authorization: Bearer <jwt>`.
2. Loads the active `fgn_academy` integration row.
3. POSTs `{ email, external_user_id, timestamp }` (canonical JSON) to `passport_magic_link_endpoint` with:
   - `X-Play-Signature: <hex HMAC-SHA256>` over the raw body, secret `PLAY_WEBHOOK_SECRET` (same scheme as §6).
   - `X-FGN-Event: passport_magic_link`.
4. Expects `{ url }` back, opens it client-side in a new tab.

To activate: Academy provides endpoint URL → Play sets `passport_link_mode='magic_link'` + `passport_magic_link_endpoint=<url>` in the same row. No redeploy.

### Asks still open (re-stated for §9)
1. **Option A or B?** Option B preferred (reuses PR P-3 `external_user_id` + §6 HMAC scheme; preserves Academy session/auth).
2. **If Option A:** final path template + lookup key (`email` / `external_user_id` / `slug`). If `slug`, also provide the slug-resolution endpoint.
3. **If Option B:** endpoint URL + confirmation it accepts `X-Play-Signature` HMAC-SHA256 with `PLAY_WEBHOOK_SECRET`, keyed on PR P-3 `external_user_id`.

### Today's behavior
Default template `/passport?email={email}` still returns 404 on `https://fgn.academy/passport?email=<urlencoded>`. We're holding the default until §9 lands rather than guessing.
