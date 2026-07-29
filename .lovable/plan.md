## Answers first

**Does the points database exist?** Yes. `season_scores` already stores per-user, per-season `points` (lifetime earned) and `points_available` (spendable). Every existing earning path — tournament match results, challenge approvals, quest completions, manual moderator adjustments — writes to this same table. So once a balance is imported there, it keeps growing from events automatically with no extra wiring.

**Is Discord username a good match key?** Partly, and this is the main risk to plan around:
- `profiles.discord_username` is populated on only **29 of 1,244** profiles.
- `legacy_users.discord_username` is populated on **2,069 of 4,739** rows, and 501 of those are already linked to a real account via `matched_user_id`.

So the import will match through two hops: profile Discord first, then legacy-user Discord → matched account. Realistically several hundred rows will match and the rest will land in the unmatched report.

## What gets built

### 1. Admin import page — `/admin/points-import`
Platform-admin only, added to the admin sidebar.

- Upload a `.csv` or `.xlsx` file (your sheet exported directly — column D Discord Username, column M Points).
- Column mapper: auto-detects a Discord column and a Points column by header name, with dropdowns to override if the auto-detect picks wrong.
- **Dry-run preview is mandatory** before anything is written. Shows: rows parsed, matched, unmatched, duplicate Discord entries, invalid/blank point values, and a table of what each matched player's balance will become.
- Confirm button applies the import.

### 2. Matching logic
Per row, normalized Discord handle (lowercased, `@` and any `#0000` discriminator stripped):
1. `profiles.discord_username` exact normalized match.
2. Else `legacy_users.discord_username` → `matched_user_id` → profile.
3. Else unmatched.

Ambiguous handles (matching two different accounts) are treated as unmatched rather than guessed.

### 3. Applying points
- Target: **Season 2026-03** (current active season).
- Credits **both** `points` and `points_available`, so the balance is immediately spendable in the Prize Shop.
- Upsert on `(season_id, user_id)` — adds to an existing row, creates one if absent.
- Every credit also writes a `point_adjustments` audit row with `adjustment_type = 'csv_import'` and a reason naming the file and batch, so it appears in the moderator Points audit trail.
- Idempotency: each import gets a batch ID; re-uploading the same file is detected and warned about before it double-credits.

### 4. Unmatched report
Per your choice, unmatched rows are skipped, not staged. After the run you get a summary and a **Download unmatched CSV** button containing the original row, the reason (no Discord match / blank points / ambiguous), so you can fix handles in the sheet and re-upload just those.

## Technical details

- New edge function `import-points` (verify_jwt in-code, platform-admin check) does parsing-agnostic work: it receives already-parsed rows, resolves matches server-side against `profiles` and `legacy_users`, and writes `season_scores` + `point_adjustments` in a batch. Client never writes points directly.
- File parsing happens in the browser (`xlsx` / `papaparse`) so the 20MB upload path and Graph/Sheets connectors aren't needed.
- Migration: add `import_batch_id uuid` to `point_adjustments` (nullable) for idempotency and rollback, and allow `'csv_import'` as an adjustment type.
- Rollback path: a small admin action that reverses a batch by ID, subtracting the exact credited amounts, in case an import goes wrong.
- No changes to any existing earning path — tournaments, challenges, and quests continue writing to `season_scores` unchanged.

## Not included

- No automatic ongoing sync from the spreadsheet. This is a one-time (repeatable) import; after it, the site is the source of truth. Say the word if you'd rather have a live Google Sheets link instead.
