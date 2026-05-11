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

The canonical cross-reference on Play side is **`docs/play-fgn-gg-integration-guide.md` §7 + "Skills Taxonomy (May 2026)"**. On Academy side, link from your top-level ecosystem integration guide (the one that already documents `challenge_completion` payloads) — **not** just `cdl-quest.md`, since the taxonomy spans CDL, OSHA, Fiber, and Gaming. If you want a per-track companion doc (`cdl-quest.md`, `osha-overlay.md`, `fiber-tech.md`), each can deep-link to the relevant namespace section above.

### Asks for Academy
1. **Confirm** Academy will accept and surface arbitrary `<namespace>:<skill>` tags without an allow-list update on your side.
2. **Coordination question:** should we align the canonical OSHA / CDL / Fiber tag list with Academy's `challenge_tracks.gate_mode` taxonomy now, or keep them independent for one more iteration?
3. **Re-asking from above** so we can close before P1 (in-app Skill Passport render) starts:
   - PR P-2 14-day legacy `X-App-Key` window — confirm acceptable?
   - Webhook HMAC scheme (header name + canonical string format) for the Phase E receiver.
