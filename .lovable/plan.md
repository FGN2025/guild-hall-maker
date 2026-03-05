

# Fix: Public Access for Embeddable Calendar

## Problem
The embed calendar route (`/embed/calendar/:configId`) is correctly outside the `ProtectedRoute` wrapper in React routing. However, the database queries fail for unauthenticated (anonymous) users because the RLS policies on `calendar_publish_configs` and `tournaments` are all **restrictive** (`RESTRICTIVE` mode). Restrictive policies use AND logic and require at least one **permissive** policy to also exist and pass. Since no permissive SELECT policy exists for the `anon` role, anonymous users get zero rows back, making the calendar appear empty or causing a redirect.

## Fix

Run a migration that:

1. **Drops** the existing restrictive "Anyone can view active configs" policy on `calendar_publish_configs`
2. **Creates** a new **permissive** SELECT policy on `calendar_publish_configs` for `anon` and `authenticated` roles, filtering by `is_active = true`
3. **Adds** a **permissive** SELECT policy on `tournaments` for `anon` (the existing "Anyone can read active games" is restrictive, so add a permissive one for public reads so the embed can fetch tournament data)
4. **Adds** a **permissive** SELECT policy on `tenant_events` for `anon` where `is_public = true AND status = 'published'` (so tenant events also show in the embedded calendar)

## Files Changed

| File | Action |
|---|---|
| Migration SQL | Fix RLS policies to allow `anon` SELECT access for embed data |

No code changes needed — the React routing and component are already correct.

