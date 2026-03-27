

## Add `certification_description` Column to Challenges

### What
Add a `certification_description` text column to the `challenges` table so the Claude agent's JSON output maps directly to the database with no transformation needed.

### Implementation
Single database migration:

```sql
ALTER TABLE challenges ADD COLUMN certification_description text;
```

No code changes required — the column is nullable with no default, so existing queries and UI are unaffected. The agent can populate it on publish, and the platform can surface it later when needed (e.g., on the ChallengeDetail page or in the academy sync payload).

### Files Changed

| File | Change |
|---|---|
| DB migration | Add `certification_description text` column to `challenges` |

