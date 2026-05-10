# Phase F Smoke Test Runbook

**Audience:** Whoever has access to the **FGN Academy** Supabase project (`vfzjfkcwromssjnlrhoo`, Lovable project `bdc55f68-…`).

**Goal:** Prove that the new track-aware `sync-challenge-completion` function on the Academy side produces the **same Academy-side state** as the pre-Phase-F (hardcoded) path for the two seeded tracks:

- `osha_safety_overlay` — gate `all_completed`, 4 member challenges
- `fiber_optics_construction` — gate `per_challenge`, 13 member challenges

The play.fgn.gg sender (`sync-to-academy`) is unchanged — payload bytes are identical pre/post Phase F. All parity work is on the receiver.

---

## 0. Prereqs

- Access to the Academy Supabase project + edge function logs.
- The shared `ECOSYSTEM_API_KEY` (same value as on play).
- A **pre-Phase-F capture** of an Academy write for one OSHA challenge and one Fiber challenge. If you don't have one, grab the most recent rows from `skill_passport_*` tables that were written under the old code path and treat those as the baseline.
- `psql` or the Supabase SQL editor.
- `curl` or the `supabase--curl_edge_functions` tool.

---

## 1. Pick the test challenges

Run on the **play** project to get one challenge per track:

```sql
select ct.slug as track,
       ctm.challenge_id,
       c.title,
       c.difficulty,
       g.name as game
from challenge_track_membership ctm
join challenge_tracks ct on ct.id = ctm.track_id
join challenges c on c.id = ctm.challenge_id
left join games g on g.id = c.game_id
where ct.slug in ('osha_safety_overlay','fiber_optics_construction')
order by ct.slug, ctm.position
limit 20;
```

Pick:

- **OSHA**: any one `osha_safety_overlay` challenge → `OSHA_CHALLENGE_ID`
- **Fiber**: any one `fiber_optics_construction` challenge → `FIBER_CHALLENGE_ID`

Also pick a **test learner email** that exists in both Academy and play (`TEST_EMAIL`).

---

## 2. Fire the payloads

Both payloads follow the contract in `docs/play-fgn-gg-integration-guide.md` §4. Send them directly to the Academy receiver.

### 2.1 OSHA — `all_completed` gate

This challenge is one of 4 in the track. The receiver must **enroll/advance** the learner in the OSHA course/lesson but **not mark the track complete** unless this is the 4th one.

```bash
curl -X POST \
  "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion" \
  -H "Content-Type: application/json" \
  -H "X-Ecosystem-Key: $ECOSYSTEM_API_KEY" \
  -H "X-Ecosystem-App: play" \
  -d '{
    "user_email": "TEST_EMAIL",
    "challenge_id": "OSHA_CHALLENGE_ID",
    "score": 92,
    "completed_at": "2026-05-10T12:00:00.000Z",
    "task_progress": [],
    "skills_verified": ["difficulty:intermediate","gaming-proficiency"],
    "metadata": {
      "source": "play.fgn.gg",
      "awarded_points": 920,
      "max_points": 1000,
      "smoke_test": "phase-f-osha"
    }
  }'
```

### 2.2 Fiber — `per_challenge` gate

Each Fiber challenge maps 1:1 to a lesson. The receiver should resolve to a single lesson and mark **that lesson** complete, regardless of the other 12.

```bash
curl -X POST \
  "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/sync-challenge-completion" \
  -H "Content-Type: application/json" \
  -H "X-Ecosystem-Key: $ECOSYSTEM_API_KEY" \
  -H "X-Ecosystem-App: play" \
  -d '{
    "user_email": "TEST_EMAIL",
    "challenge_id": "FIBER_CHALLENGE_ID",
    "score": 88,
    "completed_at": "2026-05-10T12:05:00.000Z",
    "task_progress": [],
    "skills_verified": ["difficulty:intermediate","gaming-proficiency"],
    "metadata": {
      "source": "play.fgn.gg",
      "awarded_points": 880,
      "max_points": 1000,
      "smoke_test": "phase-f-fiber"
    }
  }'
```

Both should return `200 OK` with a JSON body. Capture the response — you'll diff it against the baseline.

---

## 3. Verify the receiver took the right branch

Pull the function logs on the **Academy** project and confirm the track-lookup block fired:

```
supabase functions logs sync-challenge-completion --tail 100
```

Expected log markers (names may differ slightly — check the actual function source on Academy):

| Branch | Expected log line / field |
|---|---|
| Track lookup hit | `track_slug=osha_safety_overlay` (or `fiber_optics_construction`) |
| Course resolution | `course_id=<uuid>` resolved from track |
| Lesson resolution | `lesson_id=<uuid>` resolved from challenge_id |
| Gate evaluation | `gate_mode=all_completed` / `per_challenge` |
| Gate result | `gate_passed=true` (Fiber, single) or `gate_passed=false` until 4/4 (OSHA partial) |

If the log shows `track_slug=null` or it falls through to the legacy "single-challenge → single-lesson" path, **Phase F is not active for this challenge** — check `challenge_track_membership` on play and `challenge_lesson_mappings` on Academy.

---

## 4. Diff Academy-side writes against the baseline

For each test challenge, compare the rows written under the new code path to the pre-Phase-F baseline.

### 4.1 Tables/fields to diff

Run on the **Academy** project. Substitute table names if Academy uses different ones — the categories matter, not the exact names.

```sql
-- Enrollment / progress row
select user_id, course_id, lesson_id, status, score,
       completed_at, accent, icon, source, metadata
from skill_passport_progress
where user_email = 'TEST_EMAIL'
  and updated_at > now() - interval '15 minutes'
order by updated_at desc;

-- Track-level state (if Academy mirrors track gate)
select user_id, track_slug, gate_mode, gate_passed,
       member_count, completed_count, updated_at
from skill_passport_tracks
where user_email = 'TEST_EMAIL'
order by updated_at desc;

-- Outbound credential / badge writes, if any
select user_id, credential_type, issued_at, payload
from skill_passport_credentials
where user_email = 'TEST_EMAIL'
order by issued_at desc
limit 10;
```

### 4.2 Fields that MUST match baseline byte-for-byte

| Field | Why |
|---|---|
| `course_id` | Track → course resolution must be stable |
| `lesson_id` | Challenge → lesson must be stable |
| `status` | `passed` / `failed` / `in_progress` mapping unchanged |
| `score` | Pass-through from payload |
| `accent`, `icon` | Visual mapping driven off track, must equal hardcoded value |
| `source` | Should still be `play.fgn.gg` |

### 4.3 Fields ALLOWED to differ

| Field | Why |
|---|---|
| `id`, `created_at`, `updated_at` | Per-row timestamps |
| `metadata.smoke_test` | Only present in this run |
| `metadata.track_resolution` | New under Phase F — receiver may now record how it resolved the track; this is additive |
| Log line ordering | Cosmetic |

### 4.4 Gate-specific expectations

**OSHA (`all_completed`):**

- After 1 of 4 fired: `gate_passed=false`, `completed_count=1`, no credential issued.
- Fire the other 3 (re-run §2.1 with the other three `OSHA_CHALLENGE_ID`s and incrementing timestamps): on the 4th, `gate_passed=true` and the OSHA overlay credential should appear in `skill_passport_credentials`. Diff that credential payload against the pre-Phase-F equivalent.

**Fiber (`per_challenge`):**

- A single fire should produce exactly one lesson completion and (if Academy issues per-lesson credentials) one credential. No dependency on the other 12.

---

## 5. Pass criteria

The smoke test **passes** when, for both tracks:

1. HTTP 200 from `sync-challenge-completion`.
2. Logs show the track-lookup branch fired (not the legacy fallback).
3. The §4.2 fields in the new write equal the pre-Phase-F baseline.
4. Gate behavior matches §4.4 (OSHA partial vs. 4/4, Fiber single).
5. No errors in `function_edge_logs` for `sync-challenge-completion` during the test window.

If any of those fail, capture:

- The full payload sent
- The full response body
- The matching `function_edge_logs` row(s)
- The diff between the new row and baseline

…and send back to the play side so we can decide whether it's a receiver bug or a contract drift.

---

## 6. Cleanup

The smoke test writes real progress rows for `TEST_EMAIL`. Either:

- Use a dedicated test learner whose progress doesn't matter, **or**
- Roll back manually:

```sql
delete from skill_passport_progress
where user_email = 'TEST_EMAIL'
  and metadata->>'smoke_test' like 'phase-f-%';

delete from skill_passport_credentials
where user_email = 'TEST_EMAIL'
  and payload->>'smoke_test' like 'phase-f-%';
```

(Adjust table names to match Academy's schema.)

---

## 7. Contact

Questions on the play-side payload or track membership: ping the play.fgn.gg platform admins. Questions on Academy's resolution logic, course/lesson IDs, or credential schema: Academy team owns those.
