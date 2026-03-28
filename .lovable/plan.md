

## Run Claude Agent Schema Migration

### What
Execute the consolidated migration from the Claude Trade Skills Agent team. This adds 5 columns to `challenges` and inserts one `app_settings` row for agent scoring configuration.

### Database Migration (single script)

**Part 1 — Add 5 columns to `challenges`:**

| Column | Type | Purpose |
|--------|------|---------|
| `cdl_domain` | text | CDL skill domain the challenge targets |
| `cfr_reference` | text | FMCSA CFR citation for the CDL domain |
| `coach_context` | text | AI Coach system context injected on challenge page |
| `suggested_coach_prompts` | jsonb | Array of challenge-specific coaching prompt suggestions |
| `cover_image_prompt` | text | Structured image generation prompt for cover art |

All nullable, no defaults — zero impact on existing data or queries.

**Part 2 — Insert `agent_scoring_config` into `app_settings`:**

A JSON config row controlling points rubric, placement ratios (1st/2nd/3rd/participation), type multipliers, and domain/challenge-level overrides. This is read by the agent when generating challenge JSON.

### Code Changes
None required. These columns are agent-populated on publish and the config row is read by the external agent. Existing UI and queries are unaffected since all columns are nullable and the config uses the existing `app_settings` key-value pattern.

### Files Changed

| File | Change |
|------|--------|
| DB migration | `ALTER TABLE challenges ADD COLUMN ...` ×5 with comments; `INSERT INTO app_settings` for scoring config |

