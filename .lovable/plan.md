

## Test Plan: Legacy User Migration Process

### Overview

This is a 4-phase test covering the entire flow: dry run, small batch migration, login detection, and password reset. All tests use real data already in the database.

### Phase 1 — Dry Run Verification

**Goal**: Confirm the edge function reads data correctly without creating any accounts.

1. Log in as an admin user
2. Navigate to Admin → Legacy Import
3. Open browser dev tools (Network tab)
4. Invoke the function with `dry_run: true` by temporarily adding a dry-run button, OR use the edge function test tool to call `bulk-register-legacy-users` with `{ "dry_run": true }`
5. **Expected result**: Response contains `total_legacy` (~4,719), `unique_emails` (~4,429), `dry_run: true`
6. **Verify**: No new rows in `profiles`, no `matched_user_id` updates in `legacy_users`

### Phase 2 — Small Batch Migration (5 users)

**Goal**: Confirm accounts are created correctly with profile and tenant linkage.

1. Call the edge function with `{ "batch_size": 5 }` — it will process all users but in batches of 5 (to test batching logic). To limit the actual scope, we can check the first few results.
2. **Verify in the database after the run**:
   - `legacy_users` rows now have `matched_user_id` and `matched_at` populated
   - Corresponding `profiles` rows exist with `gamer_tag` = `legacy_username`
   - `user_service_interests` rows exist for users that had a `tenant_id`
   - Auth accounts are pre-confirmed (`email_confirmed_at` is set)
3. **Check for duplicates**: The 6 emails overlapping with existing auth accounts should be auto-matched (not create duplicate accounts)

### Phase 3 — Login Flow for Migrated Legacy User

**Goal**: Confirm the Auth page detects legacy users and guides them to password reset.

1. Pick one email from the newly migrated batch
2. Go to `/auth` (logged out)
3. Enter the email and any random password, click "Sign In"
4. **Expected**: Toast message appears: "Welcome back! ... A password reset link has been sent to your email."
5. **Verify**: `resetPasswordForEmail` was called (check Network tab for the Supabase auth request)

### Phase 4 — Password Reset End-to-End

**Goal**: Confirm a migrated legacy user can set a password and log in.

1. Check the inbox for the email from Phase 3 — a password reset email should arrive
2. Click the reset link — should redirect to `/reset-password`
3. Set a new password
4. Log in with the email + new password
5. **Expected**: Successful login, user lands on `/dashboard`
6. **Verify**: Profile shows the legacy `gamer_tag`, user appears in the correct tenant's player list

### Phase 5 — Unmatched Legacy User Detection (pre-migration)

**Goal**: Confirm the Auth page handles users who haven't been migrated yet.

1. Before running the full migration, find a legacy email that is still unmatched (`matched_user_id IS NULL`)
2. Try to log in with that email on `/auth`
3. **Expected**: Toast says "Welcome back! Your account from our previous platform was found. Please use 'Forgot Password' below to set a new password."
4. This user cannot reset password yet (no auth account exists) — the message correctly tells them to use Forgot Password, but the reset email won't arrive until the bulk migration runs

### How to Execute

I can run Phases 1-2 right now using the edge function test tool and database queries to verify results. Phases 3-5 require manual browser testing on the preview.

### Risks to Watch

- **Timeout**: The full migration of ~4,400 users may exceed the edge function timeout (default 60s). If it does, we'll need to add pagination/chunking with multiple calls.
- **Rate limits**: Supabase `admin.createUser` may have rate limits that slow bulk creation.
- **The `listUsers` call on line 137**: For auto-matching, the function calls `listUsers({ perPage: 1000, page: 1 })` for every duplicate email — this is inefficient and may miss users beyond page 1. This should be flagged for improvement.

