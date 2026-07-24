## Goal

Restrict the Tenant Events game picker to games that support tournaments, and generalize the same tagging to Quests and Challenges. Super admins tag each game with the formats it supports; downstream pickers filter or grey out options accordingly.

## 1. Schema — `games` table

Migration adds three boolean columns (default `false`):

- `supports_tournaments`
- `supports_quests`
- `supports_challenges`

Backfill from current usage:
- Set `supports_tournaments = true` for any game name referenced in `tournaments.game`.
- Set `supports_quests = true` for any game id referenced in `quests.game_id`.
- Set `supports_challenges = true` for any game id referenced in `challenges.game_id`.

No RLS changes (existing games policies cover it).

## 2. Super-admin tagging UI

`src/components/games/AddGameDialog.tsx` (create + edit form): add a "Supported Formats" section with three checkboxes/switches: Tournaments, Quests, Challenges. Persist through existing `useCreateGame` / `useUpdateGame`.

`src/pages/admin/AdminGames.tsx` (list rows and grid cards): show three small badges (T / Q / C) so admins can see coverage at a glance.

`src/hooks/useGames.ts`: extend the `Game` interface with the three flags.

## 3. Tenant Events picker (`src/pages/tenant/TenantEvents.tsx`)

- Game dropdown: show only games where `supports_tournaments = true`. If the tenant is editing an existing event whose game no longer qualifies, keep that value selectable with a "(no longer supported)" hint so the row stays editable.
- Format select: unchanged (all tournament formats remain available).

## 4. Quest and Challenge pickers

For symmetry with the request ("Those choices should be greyed out if the game is not tagged accordingly"):

- Challenge create/edit game picker (admin/moderator): filter to `supports_challenges = true`, with the same "grandfather existing" rule.
- Quest create/edit game picker: filter to `supports_quests = true`, same rule.

These edits stay presentational — no changes to quest/challenge business logic.

## 5. Format-choice greying (cross-surface)

Where a single UI lets a user pick between Tournament / Quest / Challenge as an activity type (currently none in Tenant Events, which is tournament-only), each option is disabled with a tooltip when the selected game doesn't carry the matching flag. If no such combined picker exists today, this rule is captured for future surfaces and no code changes are needed now.

## Technical notes

- Filtering is client-side in `useGames` consumers; no new hook needed.
- The `format` field on `tenant_events` continues to describe bracket style (single/double elim, etc.), not activity type — no change.
- Backfill query must be part of the same migration so no live tenant loses their existing game selections.

## Out of scope

- Renaming tournament formats.
- Any changes to how quests/challenges are authored beyond the game picker filter.
- Public `/games` page filtering by format tag (can follow later if desired).
