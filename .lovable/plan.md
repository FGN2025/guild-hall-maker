# Phase 1 — Canonical Simulation Activity identity on FGN.GG

Adds a durable cross-application identity underneath existing Challenges. No player-facing change, no destructive migration, no rebuild.

## A. Current state (verified)

- `challenges` (45 columns) already carries `game_id`, `track` (`standard` / `competitive_gaming`), `skill_tags`, `academy_next_step_url/label`, `cdl_domain`, `cfr_reference`. No canonical cross-app identifier exists — Academy and Merits currently key off `challenge_id`.
- `challenge_tasks` (id, challenge_id, title, description, display_order, verification_type, steam fields) — stable IDs, referenced by evidence and task point awards.
- `challenge_completions` already has Academy provenance columns (`academy_synced`, `academy_synced_at`, `academy_sync_note`, `academy_next_step`).
- `games` has `id, slug, name, category, platform_tags, steam_app_id, fgn_origin_game_id` — no version/edition field.
- `merit_challenges` is the existing precedent for a join table (merit_id ↔ challenge_id, weight, order).
- Ecosystem API: `ecosystem-data-api` with actions health, tournaments, tenant-events, challenges, games, quests, player-progress, achievements, season-stats.
- Live webhook subscribers: `challenge_completion` → fgn_academy; `challenge.created` / `challenge.updated` / `challenge.deactivated` → scouts_merit_builder; `tenant.marketing.created` → grok_cos.
- Golden-path games present: American Truck Simulator (18 active), Construction Simulator (32), House Flipper 2 (8), Microsoft Flight Simulator 2024 (6). Farming Simulator is stored as **Farm Simulator 2025** — same game, different label.

## B. Proposed data model

New table `simulation_activities`:
`id` uuid pk, `canonical_name`, `canonical_slug` (unique), `canonical_description`, `game_id` fk → games, `game_version` text null, `platform_applicability` text[] , `activity_category` text, `industry_domain` text, `status` enum (`draft`,`active`,`retired`), `provenance` text (`manual`,`derived_from_challenge`,`imported`), `source_challenge_id` uuid null, `schema_version` int default 1, `created_by`, `created_at`, `updated_at`.

New link table `simulation_activity_challenges` (so one activity can carry several challenge variants, and later task-level granularity):
`id`, `simulation_activity_id` fk, `challenge_id` fk, `challenge_task_id` uuid null (null = whole challenge), `mapping_status` enum (`matched`,`needs_review`,`entertainment_only`,`academy_linked`,`legacy`,`retired`,`orphaned_source`), `confidence` numeric null, `academy_work_order_ref` text null, `review_notes`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`. Unique on (activity, challenge, coalesced task).

Also on `challenges`: nullable `simulation_activity_id` as the convenience primary pointer (kept in sync with the link table's primary row) and nullable `content_classification` text (`simulation` | `entertainment_only`). Both nullable — nothing breaks if unset.

RLS + grants: read for authenticated, write only for platform admins; service_role full. No player-facing read requirement in Phase 1.

## C. Migration strategy

- Additive migration only. No challenge, task, completion, evidence, points, XP, badge or history record is altered, recreated or re-timestamped.
- Backfill nothing automatically. Activities are created only through the admin console or the golden-path seed.
- Challenges with `track = 'competitive_gaming'` are pre-suggested as `entertainment_only`, never forced.
- A candidate-matching helper suggests possible duplicates by normalized name within the same game — suggestions only, written as `needs_review`, never auto-merged.

## D. Admin experience

New admin-only page **Activity Mapping** (`/admin/activity-mapping`, sidebar entry under the existing admin group). Not linked from any player surface.

- Table of every challenge: game, challenge name, challenge id, mapped activity name + id, mapping status, Academy reference, task count.
- Filters by game, status, unmapped-only, track.
- Row actions: link to existing activity, create activity from this challenge (prefills name/description/game), change status, flag for review, add review note, expand to see task IDs.
- Separate Activities tab: list/create/edit/retire activities, see duplicate candidates side by side.
- Challenge create/edit dialogs gain an optional Simulation Activity picker (required only when the game is a simulation title and the challenge is not classified entertainment-only) — enforced in the form, not in the database, so nothing existing breaks.

## E. API changes

- `ecosystem-data-api`: existing actions and field names untouched. The `challenges` action gains `simulation_activity_id` plus a nested `simulation_activity` object (null when unmapped) and task `id` values in the tasks array.
- New actions `simulation-activities` (list, `since`/`limit` supported) and `simulation-activity` (single, with its challenges and tasks).
- Same `X-Ecosystem-Key` auth, same `{ data: ... }` envelope, same sync logging.

## F. Event changes

- New events `simulation_activity.created`, `simulation_activity.updated`, `simulation_activity.retired`, dispatched through the existing `ecosystem-webhook-dispatch` function with the same envelope, HMAC signing and delivery headers. They only deliver to webhooks explicitly subscribed to those types, so no current consumer sees new traffic.
- Existing `challenge.*` and `challenge_completion` payloads gain `simulation_activity_id` as an additive field — no renames, no removals.

## G. Golden path (5 activities, seeded after schema approval)

One existing challenge each from House Flipper 2, Construction Simulator, Farm Simulator 2025, American Truck Simulator, Microsoft Flight Simulator 2024. The specific five challenges will be proposed for your approval before insertion. For each: game → activity → existing challenge (unchanged ID) → existing tasks (unchanged IDs) → Academy reference where known → status `matched` or `academy_linked`.

Acceptance: all five visible in the console with both IDs and task IDs; ecosystem API returns the canonical identity for each; the player-facing challenge still enrols and completes normally.

## H. Regression plan

Verify unchanged after the migration: /challenges hub and game tiles with counts, individual challenge pages, enrolment, completion, evidence submission and review, points, XP, achievements, badges, leaderboards, Prize Shop and redemption, tenant challenge scheduling and branding, tournaments, competitive gaming, admin challenge management, the 8 ecosystem Test Connection checks, Academy `challenge_completion` sync, and the three Merits `challenge.*` subscriptions.

## I. Risks / questions for approval

1. **Farming Simulator naming** — the catalogue holds "Farm Simulator 2025". I will use that record; say the word if you also want the display name corrected.
2. **Mapping grain** — Phase 1 maps activity → challenge, with the task column present but unused. Confirm that is the right starting grain.
3. **Academy reference format** — stored as a free-text `academy_work_order_ref` until Academy publishes a work-order ID contract. Confirm, or give me the ID format now.
4. **New-challenge enforcement** — proposed as a form-level requirement for simulation games only, with competitive gaming exempt. Confirm.
5. The five golden-path challenges will be listed for your sign-off before any data is written.
