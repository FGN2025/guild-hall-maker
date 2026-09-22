# Phase 1 — Canonical Simulation Activity identity (final schema + Golden Paths)

Revised per the approved refinements. Nothing is written until you approve this schema and the five mappings.

## 1. Final schema

### `simulation_activities`

| column | type | notes |
|---|---|---|
| `id` | uuid pk default gen_random_uuid() | the canonical `simulation_activity_id` |
| `canonical_name` | text not null | |
| `canonical_slug` | text not null | unique |
| `canonical_description` | text | |
| `game_id` | uuid not null | FK → `games(id)` on delete restrict |
| `game_version` | text null | e.g. "2024", "25" — free text, informational |
| `platform_applicability` | text[] default '{}' | |
| `activity_category` | text | e.g. `operation`, `inspection`, `maintenance`, `logistics` |
| `industry_domain` | text | e.g. `construction`, `agriculture`, `transportation`, `aviation`, `residential_trades` |
| `status` | `simulation_activity_status` enum: `draft`, `active`, `retired` | default `draft` |
| `provenance` | `simulation_activity_provenance` enum: `manual`, `derived_from_challenge`, `imported` | default `manual` |
| `source_challenge_id` | uuid null | FK → `challenges(id)` on delete set null; provenance only |
| `schema_version` | integer not null default 1 | |
| `created_by` | uuid null | |
| `created_at` / `updated_at` | timestamptz default now() | `updated_at` maintained by trigger |

Indexes: unique `canonical_slug`; btree on `game_id`, `status`, `industry_domain`, `updated_at`.

No Academy fields. No external-reference abstraction in Phase 1.

### `simulation_activity_challenges`

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `simulation_activity_id` | uuid not null | FK → `simulation_activities(id)` on delete cascade |
| `challenge_id` | uuid not null | FK → `challenges(id)` on delete cascade |
| `challenge_task_id` | uuid null | FK → `challenge_tasks(id)` on delete cascade — **stays null in Phase 1** |
| `is_primary` | boolean not null default true | exactly one primary challenge-level row per challenge |
| `mapping_status` | `simulation_mapping_status` enum: `matched`, `needs_review`, `legacy`, `retired`, `orphaned_source` | default `matched` |
| `review_notes` | text | |
| `reviewed_by` | uuid null / `reviewed_at` timestamptz null | |
| `created_at` / `updated_at` | timestamptz | |

Constraints and indexes:
- Unique `(simulation_activity_id, challenge_id, challenge_task_id)` — implemented as a unique index over `coalesce(challenge_task_id, '00000000-...')` so nulls dedupe.
- Partial unique index: one row per challenge where `challenge_task_id is null and is_primary` — guarantees a single authoritative challenge-level activity.
- Indexes on `challenge_id`, `simulation_activity_id`, `mapping_status`.
- `mapping_status` carries no Academy state and no content classification. There is no `entertainment_only` and no `academy_linked` value.

### `simulation_activity_candidates` (advisory, never canonical)

Suggestions only, produced by normalized-name similarity within the same game and cached here so an admin can act on them. Columns: `id`, `challenge_id`, `suggested_activity_id` (nullable — a suggestion may be "create new from this challenge"), `similarity` numeric, `basis` text, `state` enum `pending` / `accepted` / `rejected`, `decided_by`, `decided_at`, timestamps. Rows here are never read as relationships; accepting one inserts a real `simulation_activity_challenges` row and marks the candidate `accepted`.

### New `challenges` columns

- `simulation_activity_id` uuid null, FK → `simulation_activities(id)` on delete set null — the convenience pointer.
- `content_classification` text null, check in (`simulation`, `entertainment_only`) — null for existing records until reviewed.

Both nullable and unset for all existing rows, so nothing currently published changes.

### Synchronization rule (single authority)

**The link table is authoritative.** `challenges.simulation_activity_id` is a derived mirror of the single row in `simulation_activity_challenges` where `challenge_task_id is null and is_primary = true`.

Implementation: one `AFTER INSERT/UPDATE/DELETE` trigger on `simulation_activity_challenges` that writes `challenges.simulation_activity_id` for the affected challenge (setting it to null when the primary row is removed), plus a `BEFORE UPDATE` guard on `challenges` that rejects direct writes to `simulation_activity_id` from anything other than that trigger. Nothing in the app writes the pointer directly. This is the whole of the synchronization logic — one trigger, one direction — so the two representations cannot disagree.

### RLS and grants

All three new tables: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, no `anon` grant. RLS enabled. SELECT for admins and moderators via `has_role`; INSERT/UPDATE/DELETE for platform admins only. Player-facing code never reads these tables in Phase 1.

## 2. The five proposed Golden Paths — for approval, nothing inserted

**Academy Work Order IDs:** none of the five challenges carries a resolvable Academy reference today (`academy_next_step_url` is null on all five, and GG holds no Work Order identifiers). Per refinement 3, GG will not store one. Academy will map `simulation_activity_id` → its own Work Order ID on its side.

### 1. House Flipper 2 — `3913b35e-534e-4e8a-b5d6-bb8f3c7d84bd`
- Challenge: **HF2 Skills: Paint System Selection and Room Coverage** — `c79a46d4-9aa6-43b2-914f-1f83419f2586` (beginner)
- Description: paint a complete room using HF2's upgraded per-wall painting system, apply a two-tone or accent treatment, and record paint system and sheen selection.
- Tasks: Clean all surfaces and select paint system `d05b7219-75d2-42dd-bf41-dcfe6671568c`; Apply full paint coverage with accent treatment `9e307ffa-7881-4433-b5b0-4732eac9cafa`; Paint system and sheen selection annotation `31622ceb-cea0-42a6-8986-04ee106a667a`; Second room with different room type paint approach `fd7d062c-c8e4-4f26-b01b-dc82957a5670`
- Proposed activity: **Interior Surface Preparation and Painting** — prepare interior wall surfaces, select an appropriate paint system and sheen for the room type, and apply full coverage including accent treatment. Category `finishing_work`; domain `residential_trades`.
- Why: matches the canonical example in the brief, clean one-activity-one-challenge grain, tasks describe a single coherent trade task.

### 2. Construction Simulator — `4a43cc04-2745-4938-8bbe-8ffe1397af37`
- Challenge: **CS Fiber: Underground Utility Trench Excavation** — `02481a75-383c-485a-bdff-f0a4dd2b9121` (intermediate)
- Description: excavate a utility-grade trench for fiber conduit with consistent width and depth, OSHA-style spoil setback, dump-truck coordination and pre-entry hazard verification.
- Tasks: Excavate the Trench Using Successive Passes `6fa85083-971b-4f38-b66e-46064060faf6`; Maintain Consistent Trench Width and Depth `039bca7a-603a-4263-b8f9-7f7af2b24c82`; Manage Spoil Placement With OSHA-Style Setback Discipline `e0e67962-8f62-49bb-a272-c8b9c07e6a70`; Dump Truck Coordination — Spoil Removal `a0164d28-cb1b-4870-b4ee-2d9a4b340d3c`; UUIT Trench Safety Annotation `f4f67f16-6a29-4a5d-aaad-c35bb3259828`
- Proposed activity: **Excavation and Trenching** — excavate and maintain a utility-grade trench to consistent geometry with compliant spoil placement and pre-entry hazard verification. Category `equipment_operation`; domain `construction`.
- Why: the brief's second canonical example; sits in a family of related CS trench challenges, so it exercises the one-activity-many-challenges design later.

### 3. Farm Simulator 2025 — `ecd6b3ca-06d2-4139-846e-a5bb02dc5ceb` (existing record, name untouched)
- Challenge: **FS25 CDL: Bulk Grain Haul** — `7ceee2be-1279-45a1-97eb-618db5d403d7` (beginner)
- Description: load grain in the field, haul over rural roads with controlled speed and space management, and back in cleanly to unload at the elevator intake.
- Tasks: Load Control — No Overflow Mindset `9a4b3204-ed35-4590-b0a8-cd71ec929264`; Rural Road Haul — Safe Speed and Space Management `f031078a-7fec-4ec1-adb1-3e9fed121901`; Elevator Yard Approach and Backing Setup `d098fe04-710a-4394-88d0-52c3c600b6b1`; Unload at Trigger Zone `b4fcba5e-4f16-4197-aea7-c45dfa432324`
- Proposed activity: **Bulk Grain Hauling** — load, transport and discharge a bulk agricultural commodity from field to elevator with controlled handling and precise intake positioning. Category `logistics`; domain `agriculture`.
- Why: a named example in the brief, and it deliberately straddles agriculture and transportation — a good test that one activity is not forced into one industry silo.

### 4. American Truck Simulator — `f316a9ab-8b32-46e1-b871-7defc9dcb5e5`
- Challenge: **ATS Skills: Precision Backing and Dock** — `f969023f-d69e-4323-a508-778c6a92e7fa` (intermediate, `cdl_domain` "Basic vehicle control — backing and parking", skill tag `cdl:backing`)
- Description: three backing maneuvers — straight-line, offset and dock-style — with mirror discipline, early correction and squared finish.
- Tasks: Straight-Line Backing `b459831a-6c41-4340-b012-1e4a685f9c73`; Offset Backing `670df6d2-4db9-4f28-9138-7afffdec18a9`; Alley Dock / 90-Degree Dock-In `58a5e0a3-925f-4941-ba62-394da1c78b2c`; Mirror Discipline and Early Correction `897f6b5d-405d-41b9-8417-1ccd5ca9a0b7`; Setup Quality — Start Position `815fb3f2-ee7c-4561-89cc-40c0c94eff42`
- Proposed activity: **Trailer Positioning and Dock Approach** — maneuver an articulated vehicle in confined space through straight-line, offset and alley-dock backing to a squared final position. Category `vehicle_operation`; domain `transportation`.
- Why: the only ATS challenge already carrying a CDL domain and a curated skill tag, so it is the most likely to resolve to an Academy Work Order later.

### 5. Microsoft Flight Simulator 2024 — `7a78dd57-9061-47d3-9ee7-436a48aba2f6`
- Challenge: **MSFS Flight: Preflight Walkaround** — `7846317c-77b2-4dd4-a855-308cb659891a` (beginner)
- Description: run a disciplined Career Mode exterior inspection — covers, chocks, oil, control surfaces — then fly the mission clean.
- Tasks: Start your aviation career `41b13d4b-d5bf-4064-bb23-41709a85644f`; Walk the aircraft `733c633b-c85c-4e27-98d0-97073137acc0`; Fly the mission clean `29350954-e446-4437-84f4-47cc2b206f4a`; Why the walkaround matters `eb968636-399a-4d7c-b05a-e1b29659b71d`
- Proposed activity: **Preflight Aircraft Inspection** — perform a systematic exterior walkaround of an aircraft, identifying and resolving airworthiness discrepancies before departure. Category `inspection`; domain `aviation`.
- Why: the brief's aviation example; note its tasks mix inspection with mission conduct, which is exactly the case that later justifies task-level grain — captured as a note, not acted on now.

## 3. What follows approval

- Apply the additive migration above. No backfill, no deletion, no history change.
- Seed the five activities and their five primary mappings (`mapping_status = matched`), and set `content_classification = 'simulation'` on those five challenges only.
- Build the admin-only **Activity Mapping** console at `/admin/activity-mapping`: challenge list with game, challenge name and ID, mapped activity name and ID, mapping status, content classification, expandable task list showing task IDs; an Activities tab to create/edit/retire; a Candidates tab where suggestions are accepted or rejected by hand.
- Extend `ecosystem-data-api`: `challenges` payload gains `simulation_activity_id`, a nested `simulation_activity` object (null when unmapped) and task `id` values; new read actions `simulation-activities` and `simulation-activity`. No existing action, field or envelope changes.
- Add `simulation_activity.created` / `.updated` / `.retired` through the existing dispatcher; add `simulation_activity_id` additively to existing `challenge.*` and `challenge_completion` payloads. No renames, no removals; new events reach only webhooks explicitly subscribed to them.
- Challenge create/edit forms: explicit `content_classification` choice; when `simulation`, require picking or creating an activity before publish; when `entertainment_only`, the activity stays null. Existing records stay nullable.
- Regression pass over /challenges, game tiles and counts, challenge pages, enrolment, completion, evidence, points, XP, achievements, badges, leaderboards, Prize Shop and redemption, tenant scheduling and branding, tournaments, competitive gaming, admin challenge management, the 8 ecosystem Test Connection checks, Academy `challenge_completion` sync and the three Merits `challenge.*` subscriptions.

No player-facing change. "Simulation Activity" stays internal terminology.
