

## CDL Trade Skills Agent — Implementation Plan

### Overview
Build an admin-facing CDL challenge generator at `/moderator/challenges/generate`. Moderators select a CDL domain, click Generate, review the AI-produced challenge against an 18-point validation benchmark, then Publish to insert it as an inactive challenge. All existing challenge management UI remains untouched.

### Architecture

```text
┌─────────────────────────┐
│  ModeratorCDLGenerate    │  React page (input form → review panel)
│  /moderator/challenges/  │
│  generate                │
└───────┬─────────────────┘
        │ supabase.functions.invoke()
        ▼
┌─────────────────────────┐     HTTP POST
│ generate-cdl-challenge   │ ──────────────► Open Notebook VPS
│ (Edge Function)          │ ◄──────────────  (72.62.168.228:8502)
│ • builds prompt          │     JSON response
│ • parses challenge JSON  │
│ • runs 18-pt validation  │
└─────────────────────────┘

┌─────────────────────────┐
│ publish-cdl-challenge    │  Edge Function
│ • inserts challenges row │  (service role key, is_active=false)
│ • inserts challenge_tasks│
└─────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/cdlDomainMaps.ts` | 8 CDL domain configs: CFR refs, challenge types, default points/minutes, alignment strengths, cover image prompt themes |
| `supabase/functions/generate-cdl-challenge/index.ts` | Edge function: builds prompt from domain config, queries Open Notebook, parses JSON, runs 18-point validation, returns structured result |
| `supabase/functions/publish-cdl-challenge/index.ts` | Edge function: inserts validated challenge + tasks into DB with service role key |
| `src/pages/moderator/ModeratorCDLGenerate.tsx` | Two-state page: input form (domain select, difficulty, overrides) → review panel (validation badge, editable fields, publish/discard) |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add lazy import + route for `/moderator/challenges/generate` |
| `src/pages/moderator/ModeratorChallenges.tsx` | Add "Generate with Agent" button next to "New Challenge" (line ~301-304) |
| `supabase/config.toml` | Add `verify_jwt = false` entries for both new edge functions |

### Edge Function Details

**generate-cdl-challenge:**
- Auth: JWT validation via `getClaims()`, RBAC check for admin/moderator
- Reads `agent_scoring_config` and `agent_challenge_validation_guide` from `app_settings`
- Constructs prompt using domain map + scoring config
- POSTs to `http://72.62.168.228:8502/api/notebooks/{notebook_id}/chat` using `OPEN_NOTEBOOK_URL` and `OPEN_NOTEBOOK_PASSWORD`
- Extracts JSON from response (first `{` to last `}`)
- Runs 18-point validation against the parsed challenge
- Returns `{ challenge, tasks, validation: { passed, total, failures[] }, raw_response }`

**publish-cdl-challenge:**
- Auth: JWT + admin/moderator RBAC
- Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Inserts into `challenges` with `is_active: false`
- Inserts associated `challenge_tasks` with correct `challenge_id`
- Returns `{ challenge_id, status: 'inserted' }`

### UI — ModeratorCDLGenerate Page

**State 1 — Input Form:**
- CDL Domain dropdown (8 domains)
- CFR Reference (auto-populated, editable)
- Difficulty radio (beginner/intermediate/advanced)
- Challenge Type (auto-set from domain map)
- Points Reward (auto-calculated from scoring config, editable)
- Estimated Minutes (auto-populated, editable)
- Generate button with loading spinner

**State 2 — Review Panel:**
- Validation badge: green "18/18 Passed" or red with failure list
- All challenge fields displayed and editable
- Tasks list (title + description, editable)
- Cover image prompt (read-only with copy button)
- Coach context (expandable)
- Suggested coach prompts (read-only)
- Publish button (disabled if validation failures) + Discard button
- Post-publish: success toast with link to challenge

### No Database Changes Required
All required columns exist on `challenges` and `challenge_tasks`. The `app_settings` rows for scoring config and validation guide are already populated.

### All Required Secrets Already Exist
`OPEN_NOTEBOOK_URL`, `OPEN_NOTEBOOK_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`

### Build Order
1. `src/lib/cdlDomainMaps.ts` — domain reference data
2. `supabase/functions/generate-cdl-challenge/index.ts` — generation pipeline
3. `supabase/functions/publish-cdl-challenge/index.ts` — publish pipeline
4. `src/pages/moderator/ModeratorCDLGenerate.tsx` — generator UI
5. `src/App.tsx` + `ModeratorChallenges.tsx` + `config.toml` — routing and config

### Acceptance Criteria
- Navigate to `/moderator/challenges/generate` from Moderator panel
- Select CDL domain, click Generate, receive populated review panel
- Validation shows 18/18 on generated challenge
- Publish inserts challenge with all columns populated, `is_active: false`
- Existing challenges and management UI completely unaffected

