# P0 — Skill Tags on Challenges

Goal: give every Play challenge a real competency taxonomy, expose it to admins/mods, and forward it to Academy via `sync-to-academy` so the Skill Passport finally reflects what players actually demonstrated.

## What we're building

1. **DB**: `challenges.skill_tags text[]` (nullable, default `'{}'`), GIN index for filtering. No data backfill — leave existing rows empty; staff curates as they edit.
2. **Shared taxonomy module** (`src/lib/skillTaxonomy.ts`): canonical list of competencies grouped by track, plus helpers (`ALL_SKILL_TAGS`, `SKILL_GROUPS`, `getSkillLabel(tag)`, `isValidSkillTag(tag)`). Initial groups (extensible):
   - `cdl:*` — `cdl:pre-trip`, `cdl:backing`, `cdl:logbook`, `cdl:hazard-perception`, `cdl:fuel-mgmt` (sourced from `src/lib/cdlDomainMaps.ts`)
   - `osha:*` — `osha:fall-protection`, `osha:ppe`, `osha:lockout-tagout`, `osha:hazcom`
   - `fiber:*` — `fiber:splicing`, `fiber:otdr`, `fiber:installation`, `fiber:troubleshooting`
   - `gaming:*` — `gaming:aim`, `gaming:strategy`, `gaming:teamwork`, `gaming:macro`, `gaming:micro`
3. **Admin/Mod UI**: a `SkillTagsPicker` (multi-select with grouped sections + search) added to:
   - `CreateChallengeDialog` and `EditChallengeDialog`
   - `ModeratorChallenges` edit flow (uses same picker via shared component)
   - CDL Generator output (pre-fills `cdl:*` tags it knows about)
4. **Edge function**: rewrite `buildSkillsTags()` in `supabase/functions/sync-to-academy/index.ts` to:
   - If `challenge.skill_tags` is non-empty → send those verbatim.
   - Else → fall back to current heuristic (`difficulty:*`, `game:*`, `gaming-proficiency`) so legacy challenges keep working.
   - Always append `difficulty:<level>` as metadata, but keep competencies as the primary signal.
5. **Read surfaces**: show tags as small pills on `ChallengeCard` and `ChallengeDetail` so players see the skills they'll earn before enrolling.

## Out of scope (P1+)

- Pulling/rendering Academy Skill Passport in-app (P1)
- Skill-driven discovery / recommendations (P2)
- New webhook events (P3)
- Track-aware completion UX (P4)

## Technical notes

- Migration is additive only (`ADD COLUMN IF NOT EXISTS`, GIN index, no constraint changes). No RLS changes required — existing `challenges` policies cover the new column.
- `SkillTagsPicker` reuses shadcn `Command` + `Popover` (same pattern as `AchievementPicker`).
- `sync-to-academy` payload contract is unchanged — we keep the `skills_verified: string[]` field name. Academy already accepts arbitrary strings, so no breaking change.
- Validation: `isValidSkillTag` is advisory in the UI (warns on free-form tags) but the edge function does **not** filter unknown tags, so Academy can keep evolving its taxonomy independently.

## Files touched

```text
supabase/migrations/<ts>_challenge_skill_tags.sql        (new)
src/lib/skillTaxonomy.ts                                  (new)
src/components/shared/SkillTagsPicker.tsx                 (new)
src/components/challenges/CreateChallengeDialog.tsx       (edit)
src/components/challenges/EditChallengeDialog.tsx         (edit)
src/components/challenges/ChallengeCard.tsx               (edit — render pills)
src/pages/ChallengeDetail.tsx                             (edit — render pills)
src/pages/moderator/ModeratorCDLGenerate.tsx              (edit — pre-fill cdl:* tags)
supabase/functions/sync-to-academy/index.ts               (edit — buildSkillsTags)
docs/phase-f-status-and-open-asks.md                      (edit — note new tag shape)
docs/play-fgn-gg-integration-guide.md                     (edit — taxonomy reference)
```

## Validation

1. Create a challenge with `osha:fall-protection` + `osha:ppe`; verify `challenges.skill_tags` persists.
2. Approve evidence → check `sync-logs` payload contains `skills_verified: ["osha:fall-protection","osha:ppe"]`.
3. Legacy challenge (no tags) approval still emits the old `difficulty:*` / `game:*` / `gaming-proficiency` triple.
4. Pills render on `/challenges` and `/challenges/:id`.

## Communication to Academy devs (sent at end of P0)

Append to `docs/phase-f-status-and-open-asks.md` a new section **"Update — skills taxonomy (Play side)"** with:

- **What changed:** `skills_verified` on `challenge_completion` payloads is now a curated list of competency tags (e.g. `osha:fall-protection`, `cdl:pre-trip`, `fiber:splicing`, `gaming:aim`) instead of `difficulty:*`/`game:*` placeholders. Field name and shape (`string[]`) unchanged — no contract break.
- **Fallback behavior:** Challenges that haven't been re-tagged yet still emit the legacy triple (`difficulty:<level>`, `game:<name>`, `gaming-proficiency`). Expect a mix during the rollout window.
- **Taxonomy source of truth:** living list in `src/lib/skillTaxonomy.ts` (we'll mirror it into the integration guide). We commit to namespace-prefixed lowercase tags (`<track>:<skill>`); please key any Skill Passport mappings on the prefix so unknown skills in a known namespace fail open instead of being dropped.
- **Asks for Academy:**
  1. Confirm Academy will accept and surface arbitrary `<namespace>:<skill>` tags without an allow-list update.
  2. Should we coordinate the canonical OSHA / CDL / Fiber tag list with Academy's `challenge_tracks.gate_mode` taxonomy now, or keep them independent for one more iteration?
  3. Still open from Phase F: **PR P-2 14-day legacy `X-App-Key` window** + **webhook HMAC scheme** for Phase E receiver — re-asking so we can close them before P1 (in-app Passport render) starts.

Format the message so it can be copy-pasted into the cross-team channel.
