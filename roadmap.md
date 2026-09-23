# FGN Studio partner read API

- [x] Partner keys (organization-scoped, hashed, expiry, revoke) + short-lived token exchange
- [x] studio-api read routes: capabilities, sources, challenges (+ full tasks), activities (+ lookup), work-order relationships
- [x] Signed, scope-bound cursors; revision counters covering insert/update/delete; contract-version gate; approved-origin CORS
- [x] docs/studio-api.openapi.yaml, docs/studio-api-integration.md, verification report (29 checks)
- [ ] Add Studio's browser origin(s) to the approved list — waiting on the origin from Studio
- [ ] Issue Studio's production key once the owning organization is named

# Canonical Simulation Activity rollout


- [x] Phase 3A proposal (ATS canonicalization map) delivered — parked per user until the configurator is built
- [ ] Configurator tool — awaiting user brief
- [ ] Phase 3A execution after configurator — seed approved ATS activities, link, classify

# Run reliability checkpoint

- [x] Steps 1–2: instrumentation and generation-attributed baseline
- [x] Step 3: instrumented scratch run and measured reserve
- [x] Steps 4–5: work-derived continuation budget and no-progress guard
- [x] Step 6: credit exhaustion state
- [ ] Step 6b: universal create-path idempotency — runner deployed; OAuth MCP waits for the next authorized app publish
- [x] Step 7: resume and replay proof with regression tests
- [x] Step 8: trailing-ten reliability and completeness definition
- [x] Cleanup: remove scratch fixtures and generated scratch rows

# Merit pathways and Scouts advancement

- [x] Six pilot badge review sheets approved (Aviation, Truck Transportation, Automotive Maintenance, Electricity, Home Repairs, Safety)
- [x] Data foundation: pathways, merits, merit-challenge links, player merit progress, tenant advancement programs, versioned official badges/requirements, task-to-requirement mappings, counselor registration and badge assignments, unit-leader authorizations, requirement submissions, append-only decisions, counseling sessions, advancement records — all with grants, RLS and tenant scoping
- [x] Seed the six badges and their 2025 requirement versions from the approved sheets (209 requirements loaded)
- [x] Seed approved task-to-requirement mappings (30 MSFS, 11 ATS Skills/CDL, 13 House Flipper/House Flipper 2)
- [x] Universal player pathway hub and redesigned challenge detail
- [ ] Activate Electricity / Automotive Maintenance / Safety challenge mappings — blocked on approved activation or new challenge authoring
- [ ] Scouts tenant layer: branding, counselor review queues, partials, blue-card-equivalent export, award status

# Merit connector (Scout Merit Builder Stop 7)

Companion app: https://lovable.dev/projects/703a58c3-1f5d-41ea-b155-4b574979e185 — public URL https://merits.fgn.academy (not scouts.fgn.academy)

- [x] Contract: docs/merit-connector.openapi.yaml (+ copy in Files) covering inbound challenge webhooks and outbound passport entries
- [x] Receiver edge function merit-connector-api (ecosystem-key auth, batched passport entries, validate_only, per-entry verdicts, Skill Passport refresh enqueue, sync logging)
- [x] merit_connector_deliveries idempotency ledger (migration; service-role only)
- [x] dispatch_merit_challenge_webhook() trigger on challenges (created / updated / deactivated) via ecosystem-webhook-dispatch
- [x] Verified live: health, 401 on bad key/app, 400 on malformed payload, validate_only writes nothing, delivery_id replay → 409, harness challenge event reached the dispatcher
- [ ] Register ecosystem_webhooks row for the Scout Merit Builder receiver — waiting on the companion app's webhook URL and shared signing secret (user-created, e.g. openssl rand -hex 32)
