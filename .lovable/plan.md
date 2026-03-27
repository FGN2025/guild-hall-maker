

## Update Test Account with Completed Challenges

### Current State
User `darcylorincz@gmail.com` (`b6860126-fc33-48b0-8f50-030ffc2adbe2`) has:
- **Champion** — enrolled, completed, has completion record
- **Podium** — enrolled, status "submitted", 1 evidence (no task link)
- **Gold** — enrolled, status "enrolled", no evidence
- **Bronze, Platinum, Silver** — no enrollments at all

### What Needs to Happen

Insert/update data so all 6 challenges show as **completed** with task evidence, enrollments, and completion records.

**1. Create missing enrollments** (Bronze, Platinum, Silver) — 3 INSERTs into `challenge_enrollments` with status `completed`

**2. Update existing enrollments** (Podium → completed, Gold → completed) — 2 UPDATEs on `challenge_enrollments`

**3. Insert task evidence** for every task across all 6 challenges (26 total tasks) — evidence rows linking each task to its enrollment, using a placeholder screenshot URL

**4. Insert completion records** for the 5 challenges missing them (all except Champion which already has one) — 5 INSERTs into `challenge_completions`

**5. Update season score** — upsert `season_scores` for active season `a4c1209d-...` adding total points from all 6 challenges (60+35+20+10+5+0 = 130 pts)

### Execution
Run all INSERTs/UPDATEs via database migration tool in a single batch. No schema changes needed.

### Tables Affected
| Table | Action | Rows |
|---|---|---|
| `challenge_enrollments` | 3 INSERT + 2 UPDATE | 5 |
| `challenge_evidence` | ~26 INSERT | 26 |
| `challenge_completions` | 5 INSERT | 5 |
| `season_scores` | 1 UPSERT | 1 |

