

## Fix: delete-user Edge Function 404

**Root cause**: The `delete-user` function is NOT listed in `supabase/config.toml` with `verify_jwt = false`. On Lovable Cloud, the default JWT verification uses a different signing algorithm (ES256 vs HS256), which causes the entire function invocation to fail or corrupts the service role client context, resulting in `"Database error loading user"` from `getUserById`.

**Fix** (2 changes):

### 1. Add `verify_jwt = false` to `supabase/config.toml`
Add the delete-user function entry alongside the other functions. The function already does its own admin role verification internally, so disabling the gateway JWT check is safe.

### 2. Update `delete-user/index.ts` to use explicit token validation
Replace `callerClient.auth.getUser()` with `callerClient.auth.getUser(token)` to explicitly validate the bearer token, which is the recommended pattern for Lovable Cloud edge functions. Extract the token from the Authorization header and pass it directly.

**Files to modify**:
- `supabase/config.toml` — add `[functions.delete-user]` with `verify_jwt = false`
- `supabase/functions/delete-user/index.ts` — extract bearer token and pass to `getUser(token)`

