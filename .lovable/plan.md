

## Add Mock Challenge Data for darcylorincz@gmail.com

### Context
User `darcylorincz@gmail.com` (user_id: `b6860126-fc33-48b0-8f50-030ffc2adbe2`) currently has **zero** challenge enrollments. We'll insert test data across 3 challenges to simulate different stages of the challenge lifecycle, which will also exercise the academy sync.

### Data to Insert

**1. Challenge Enrollment — Completed (with completion record)**
- Challenge: "ATS - Champion Challenge" (60 pts, advanced)
- Enrollment status: `completed`
- Completion record with `awarded_points = 60`
- `academy_synced = false` (so sync can be tested)

**2. Challenge Enrollment — In Review (with evidence)**
- Challenge: "ATS - Podium Challenge" (10 pts)
- Enrollment status: `submitted`
- 1 evidence record (mock screenshot URL)

**3. Challenge Enrollment — Active (just enrolled)**
- Challenge: "ATS - Gold Challenge" (10 pts)
- Enrollment status: `enrolled`

**4. Season Score Entry**
- Add/update `season_scores` for the active season (`a4c1209d-...`) with 60 points from the completed challenge

### Execution
Use the database insert tool to run these INSERT statements. No schema changes needed.

### Tables Affected
| Table | Records |
|---|---|
| `challenge_enrollments` | 3 rows |
| `challenge_evidence` | 1 row |
| `challenge_completions` | 1 row |
| `season_scores` | 1 row (upsert) |

