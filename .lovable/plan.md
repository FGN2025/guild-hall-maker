## Assessment

The issue is most likely caused by incomplete legacy-player linkage, not by tenant admin roles.

What I found:
- Legacy users whose usernames start with **A-D** were bulk-migrated first: **1,212 legacy rows / 1,154 users are matched to auth accounts**.
- Those matched A-D users have **0 `user_service_interests` rows** and **0 `tenant_subscribers` rows** for their legacy tenant.
- The bulk migration code attempts to create `user_service_interests` with `upsert(... onConflict: "user_id,tenant_id")`, but the database does **not** have a matching unique constraint/index. That makes the tenant-link step fail silently while the legacy match still succeeds.
- The standalone `match-legacy-user` function also only updates `legacy_users.matched_user_id` and the profile gamer tag; it does **not** create the durable tenant/player link.
- The public event detail page inserts `tenant_event_registrations`, but after success it does not refresh the “my registration” query, so users may still see “Register Now” until a reload.

## Recommended fix plan

### 1. Add a database-level unique index for player tenant links
Create a unique index on `user_service_interests(user_id, tenant_id)` so the app can safely treat the player↔tenant link as one durable registration record.

This makes future `upsert(... onConflict: "user_id,tenant_id")` calls valid and prevents duplicate player registration rows.

### 2. Backfill existing matched legacy users into `user_service_interests`
For every `legacy_users` row with:
- `matched_user_id IS NOT NULL`
- `tenant_id IS NOT NULL`

create a `user_service_interests` row if one does not already exist.

Use safe idempotent SQL so existing staff/player exceptions are not modified and repeated runs do not create duplicates.

### 3. Fix legacy matching so future users are linked once
Update `supabase/functions/match-legacy-user/index.ts` to:
- Fetch `tenant_id` and `zip_code` from `legacy_users`
- After setting `matched_user_id`, create/upsert the matching `user_service_interests` row
- Keep the role restriction intact: this only creates player linkage, not tenant staff access

### 4. Fix bulk legacy migration so it does not silently miss tenant links
Update `supabase/functions/bulk-register-legacy-users/index.ts` to:
- Use the new unique index-backed upsert
- Check and report errors from the tenant-link step instead of ignoring them
- Also create the tenant link when an existing auth user is auto-matched

### 5. Make public event registration idempotent and visibly persistent
Update `src/pages/TenantEventDetail.tsx` to:
- Use `upsert` or gracefully handle duplicate registrations as success
- Refetch/invalidate the current user’s event registration query after success
- Ensure the button changes to “Registered” immediately after registration

### 6. Validate with targeted checks
After implementation:
- Query A-D matched legacy users and confirm they now have tenant player links
- Test a known A-D legacy account path: sign in/reset password → visit a tenant event → register once → revisit event → still shows registered
- Confirm a duplicate event registration attempt does not ask for full platform registration again and does not create duplicate rows