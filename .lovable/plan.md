

## Fix: Magic Link 404 on manage.fgn.gg

### Root Cause

The `ecosystem-magic-link` edge function generates a URL like:
```text
https://manage.fgn.gg/auth?token=<uuid>
```

But the ISP Verify Portal project has no `/auth` route. Its SSO callback lives at `/auth/sso`. The `/auth` path hits the catch-all `*` route, which renders the NotFound (404) page.

### Two-Project Fix

Changes are needed in **both** projects:

---

### Part 1: This Project (play.fgn.gg) -- 2 changes

**1. Update the magic link URL path**
- File: `supabase/functions/ecosystem-magic-link/index.ts`
- Change the generated link from `/auth?token=...` to `/auth/sso?token=...` so it lands on the existing SSO route in ISP Verify Portal

**2. Add `validate-ecosystem-token` to the config**
- File: `supabase/config.toml`
- Add `[functions.validate-ecosystem-token]` with `verify_jwt = false` -- this endpoint is called by target apps without a JWT (it validates via the token itself)

---

### Part 2: ISP Verify Portal (manage.fgn.gg) -- 1 change

**Add ecosystem token handling to SSOCallback**
- File: `src/pages/auth/SSOCallback.tsx`
- The page already handles two auth flows (`code` and `access_token/refresh_token`). A third flow will be added for the `token` parameter:
  1. Read the `token` query parameter
  2. Call this project's `validate-ecosystem-token` endpoint to verify it
  3. On success, use the returned email to generate a magic link session via the ISP Verify Portal's own auth system
  4. On failure (expired, used, invalid), show an error and redirect to login

The flow will look like:

```text
1. Admin clicks "Manage" in play.fgn.gg sidebar
2. Edge function generates token, emails magic link
3. User clicks link --> manage.fgn.gg/auth/sso?token=<uuid>
4. SSOCallback reads "token" param
5. Calls play.fgn.gg validate-ecosystem-token endpoint
6. Gets back { email, user_id, target_app }
7. Uses email to sign in locally (via OTP or session creation)
8. Redirects to /admin/dashboard
```

### Summary of File Changes

| Project | File | Change |
|---------|------|--------|
| This project | `supabase/functions/ecosystem-magic-link/index.ts` | Change `/auth?token=` to `/auth/sso?token=` |
| This project | `supabase/config.toml` | Add `validate-ecosystem-token` with `verify_jwt = false` |
| ISP Verify Portal | `src/pages/auth/SSOCallback.tsx` | Add `token` param handling that calls `validate-ecosystem-token` and establishes a local session |

