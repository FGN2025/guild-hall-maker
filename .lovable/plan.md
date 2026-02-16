

# Admin Achievement Management System

## Overview

Replace the current hardcoded, frontend-only achievement system with a database-backed one. Admins will be able to create/edit/delete achievement definitions and manually award badges to specific players.

## Database Design

Two new tables:

**`achievement_definitions`** -- Stores the templates/definitions of all achievements
- `id` (uuid, PK)
- `name` (text) -- e.g. "First Blood"
- `description` (text) -- e.g. "Win your first match"
- `icon` (text) -- one of: trophy, flame, star, crown, target, shield, swords, zap, medal
- `tier` (text) -- bronze, silver, gold, platinum
- `category` (text, default 'milestone') -- 'milestone' (auto-computed) or 'custom' (manually awarded)
- `auto_criteria` (jsonb, nullable) -- For milestone achievements: `{ "type": "wins", "threshold": 5 }` etc. Null for custom badges.
- `max_progress` (integer, nullable) -- For progress-bar display
- `is_active` (boolean, default true)
- `display_order` (integer, default 0)
- `created_at`, `updated_at` (timestamptz)

**`player_achievements`** -- Records which players have earned which achievements
- `id` (uuid, PK)
- `user_id` (uuid, not null)
- `achievement_id` (uuid, FK to achievement_definitions)
- `awarded_at` (timestamptz, default now())
- `awarded_by` (uuid, nullable) -- null = auto-computed, set = manually awarded by admin
- `progress` (integer, nullable) -- current progress toward max_progress
- `notes` (text, nullable) -- optional admin note when manually awarding
- unique constraint on (user_id, achievement_id)

**RLS Policies:**
- Both tables readable by everyone (SELECT true)
- achievement_definitions: admin-only for INSERT/UPDATE/DELETE
- player_achievements: admin-only for INSERT/UPDATE/DELETE

## Migration for Seed Data

The 12 existing hardcoded achievements will be inserted as rows in `achievement_definitions` with `category = 'milestone'` and appropriate `auto_criteria` JSON, so existing functionality is preserved.

## Files to Create

1. **`supabase/migrations/..._achievement_tables.sql`** -- Creates both tables, RLS policies, and seeds the 12 existing achievement definitions.

2. **`src/pages/admin/AdminAchievements.tsx`** -- Admin page with two tabs:
   - **Definitions Tab**: Table listing all achievement definitions with name, tier, icon, category, and active status. Buttons to create new, edit, and delete definitions. Uses a dialog form.
   - **Award Tab**: Search for a player by name, select an achievement definition, add optional notes, and click "Award" to insert into `player_achievements`. Shows a table of recent manual awards with the ability to revoke.

3. **`src/hooks/useAchievementAdmin.ts`** -- Hook with queries and mutations for:
   - Fetching all achievement definitions
   - Creating/updating/deleting definitions
   - Awarding an achievement to a player
   - Revoking a manually awarded achievement
   - Fetching recent awards

## Files to Modify

4. **`src/hooks/usePlayerAchievements.ts`** -- Rewrite to:
   - Fetch `achievement_definitions` from the database
   - Fetch `player_achievements` for the given user
   - Still compute auto-milestone progress from `match_results` data
   - Merge: an achievement is "unlocked" if it exists in `player_achievements` OR if auto-criteria is met
   - Auto-upsert into `player_achievements` when a milestone is newly met (so the award is persisted)

5. **`src/hooks/useGlobalAchievements.ts`** -- Rewrite to query `player_achievements` joined with `achievement_definitions` and `profiles`, instead of recomputing everything client-side.

6. **`src/components/player/PlayerAchievements.tsx`** -- Minor update to handle any new fields (e.g. showing "Awarded by admin" indicator on manually-awarded badges).

7. **`src/components/admin/AdminSidebar.tsx`** -- Add "Achievements" nav item with `Award` icon.

8. **`src/App.tsx`** -- Add `/admin/achievements` route.

## Implementation Approach

- The existing 12 milestone achievements become database rows with `auto_criteria` JSON like `{"type":"wins","threshold":1}`, `{"type":"streak","threshold":3}`, etc.
- The `usePlayerAchievements` hook will still compute win/loss/streak stats from `match_results`, but will check those stats against `auto_criteria` from the DB rather than hardcoded logic.
- Custom (non-milestone) achievements have no auto-criteria and can only be awarded manually by admins.
- The global achievements leaderboard will query `player_achievements` counts grouped by user, making it much more efficient than the current approach of recomputing everything.

## Technical Notes

- The `auto_criteria` JSON schema supports types: `wins`, `streak`, `matches`, `win_rate`, `tournament_champion`, `multi_tournament`, `iron_will` -- matching the current 12 hardcoded checks.
- The `player_achievements` table uses a unique constraint on `(user_id, achievement_id)` to prevent duplicate awards.
- Auto-computed achievements will be upserted into `player_achievements` when a player's profile is viewed, so the global leaderboard query stays simple.
- No changes to auto-generated files (`client.ts`, `types.ts`, `.env`, `config.toml`).

