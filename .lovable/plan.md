

# Ecosystem Interconnect Plan: play.fgn.gg ↔ FGN Academy / SimuCDL / BroadbandWorkforce

## Context

The FGN ecosystem currently consists of:
- **play.fgn.gg** (this app) -- Gaming platform with tournaments, challenges/work orders, evidence uploads, season points, achievements
- **fgn.academy** -- Industrial LMS with events calendar, work orders, communities, skill passport, sim-specific resources (ATS, Farming, Construction, Mechanic)
- **simu-cdl-path.lovable.app** -- CDL learning path with structured curriculum modules aligned to trade careers
- **broadbandworkforce.com** -- Fiber technician training LMS with AI tutor, gamified learning, cohort-based training

All are Lovable-built apps with independent Supabase backends. Cross-app auth already exists via the `ecosystem-magic-link` / `validate-ecosystem-token` edge function pair.

## Architecture: Hub-and-Spoke Data Sync via Edge Function APIs

```text
┌─────────────────────┐
│   play.fgn.gg       │  (Source of Truth)
│   ─────────────     │
│   Challenges/WOs    │
│   Evidence uploads  │
│   Tournaments/Cal   │
│   Player profiles   │
│   Season points     │
│   Achievements      │
└────────┬────────────┘
         │  Edge Function APIs (outbound webhooks + pull endpoints)
         │
    ┌────┴────┬────────────┬──────────────────┐
    ▼         ▼            ▼                  ▼
fgn.academy  simu-cdl   broadband        (future apps)
  Events     CDL LMS    Fiber LMS
  Calendar   Progress   Progress
  WO sync    Evidence   Credentials
```

## Phase 1: Data Export API (Edge Functions on play.fgn.gg)

Create a set of **read-only API endpoints** on this project that external apps can call to pull data. Each is a new edge function secured by a shared API secret.

### 1a. `ecosystem-data-api` Edge Function

A single edge function with path-based routing for all data exports:

| Route | Data Returned | Consumer |
|-------|--------------|----------|
| `POST { action: "tournaments" }` | Published tournaments with dates, games, status | fgn.academy events calendar |
| `POST { action: "tenant-events" }` | Tenant events (published status) | fgn.academy events calendar |
| `POST { action: "player-progress" }` | Challenge enrollments, evidence, completion status for a user | simu-cdl, broadbandworkforce |
| `POST { action: "achievements" }` | Player achievements with definitions | simu-cdl (skill passport) |
| `POST { action: "season-stats" }` | Season scores, points, W/L for a user | All LMS apps |
| `POST { action: "challenges" }` | Active challenges with tasks, game associations | fgn.academy work orders |

**Auth**: Validate via `X-Ecosystem-Key` header checked against a stored secret (`ECOSYSTEM_API_KEY`). Optionally also accept user JWT for user-scoped queries.

**Filtering**: Accept `since` timestamp parameter so consumers can do incremental sync (only fetch records updated after last sync).

### 1b. Database Changes

New table to track what has been synced:

```sql
CREATE TABLE public.ecosystem_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_app text NOT NULL,        -- 'academy', 'simu-cdl', 'broadband'
  data_type text NOT NULL,         -- 'tournaments', 'evidence', etc.
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  records_synced integer DEFAULT 0,
  status text DEFAULT 'success',
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

RLS: Admin-only read access.

## Phase 2: Event Webhook System (Push-based)

For real-time updates, create an outbound webhook system that pushes data to consuming apps when key events occur.

### 2a. `ecosystem-webhook-dispatch` Edge Function

Triggered by database triggers on key tables. Sends POST requests to registered webhook URLs.

**Events to broadcast:**
- `challenge.completed` -- When a player's enrollment status changes to "completed"
- `evidence.approved` -- When evidence is approved by moderator
- `tournament.published` -- When a tournament goes live
- `achievement.earned` -- When a player earns an achievement
- `season.points_awarded` -- After points are awarded

### 2b. Webhook Registry Table

```sql
CREATE TABLE public.ecosystem_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_app text NOT NULL,
  event_type text NOT NULL,
  webhook_url text NOT NULL,
  secret_key text NOT NULL,        -- For HMAC signature verification
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### 2c. Admin UI

Add an "Ecosystem" section to the Admin Settings page showing:
- Registered webhook endpoints with test/ping button
- Sync log history with status indicators
- API key management for each connected app

## Phase 3: Shared Calendar Feed

### 3a. `ecosystem-calendar-feed` Edge Function

A public (or key-authenticated) endpoint returning a merged calendar in **iCal format** or **JSON feed** that fgn.academy can consume directly:

- Platform tournaments (published, upcoming)
- Tenant events (published)
- Challenge deadlines

This builds on the existing `calendar_publish_configs` infrastructure but exposes a machine-readable format rather than an iframe embed.

## Phase 4: Evidence & Progress Forwarding

### 4a. Evidence Bridge

When evidence is approved on play.fgn.gg, the webhook payload includes:
- Player identity (email or user_id mapping)
- Challenge metadata (game, difficulty, tasks completed)
- Evidence file URLs (already public in `app-media` bucket)
- Completion timestamp and points earned

The consuming LMS (simu-cdl, broadbandworkforce) maps this to its own learning modules. For example:
- ATS challenge completion → CDL Fundamentals module credit
- Construction Sim challenge → Heavy Equipment Operator path progress

### 4b. Career Path Mapping Table

```sql
CREATE TABLE public.career_path_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id),
  challenge_id uuid REFERENCES challenges(id),
  target_app text NOT NULL,
  external_path_id text NOT NULL,     -- e.g. 'cdl-fundamentals'
  external_module_id text,            -- e.g. 'module-03-pre-trip'
  credit_type text DEFAULT 'completion', -- 'completion', 'evidence', 'hours'
  credit_value numeric DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
```

This lets admins map "Complete ATS Challenge X" → "Credit for CDL Module 3" without code changes.

## Phase 5: Shared Identity Resolution

Extend the existing `ecosystem_auth_tokens` system:

- Add `academy` and `broadband` as target apps in the magic link function
- Create a cross-reference table for user identity mapping across apps (since each app has its own auth)
- When a webhook fires user-specific data, include the source user_id so the target app can resolve it via the cross-reference

## Implementation Order

| Step | Work | Files |
|------|------|-------|
| 1 | Create `ECOSYSTEM_API_KEY` secret | Secret store |
| 2 | Build `ecosystem-data-api` edge function | `supabase/functions/ecosystem-data-api/index.ts` |
| 3 | Create `ecosystem_sync_log` + `career_path_mappings` tables | Migration |
| 4 | Build `ecosystem-calendar-feed` edge function (JSON/iCal) | `supabase/functions/ecosystem-calendar-feed/index.ts` |
| 5 | Create `ecosystem_webhooks` table + `ecosystem-webhook-dispatch` function | Migration + edge function |
| 6 | Add database triggers for outbound events | Migration |
| 7 | Build Admin UI for ecosystem management | `src/pages/admin/AdminEcosystem.tsx` |
| 8 | Update Admin Sidebar + routing | `src/App.tsx`, `AdminSidebar.tsx` |
| 9 | Add `academy` + `broadband` targets to magic link function | Edit `ecosystem-magic-link/index.ts` |
| 10 | Document API contracts for consuming apps | Admin Guide update |

## Technical Decisions

- **Edge Functions over direct DB access**: Each app has its own Supabase project. Cross-project DB access is not possible, so HTTP APIs are the correct bridge.
- **Push + Pull hybrid**: Webhooks for real-time events; polling API for bulk sync and initial data load. This matches the existing NISC/GLDS sync pattern already in the tenant system.
- **HMAC-signed webhooks**: Industry standard for webhook security. Each registered endpoint gets a unique secret for payload signature verification.
- **Career path mapping table**: Decouples game challenges from LMS modules. Admins configure mappings without developer intervention. New career paths (e.g., Precision Farmer) are just new rows.
- **Evidence file URLs are already public**: The `app-media` bucket is public, so consuming apps can display evidence directly without needing file transfer.

