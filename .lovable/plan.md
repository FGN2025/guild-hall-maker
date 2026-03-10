

## Resend Email Confirmation for Distantoneta@gmail.com

This is an operational action — Distantoneta@gmail.com registered but never confirmed their email, so they need the verification email resent.

### Approach

Create a small one-time edge function (or use an existing mechanism) to call the Supabase Auth Admin API's `resend` endpoint for this user. However, the simplest path:

1. **Add a temporary edge function** `resend-confirmation` that accepts an email and calls `supabase.auth.admin.generateLink({ type: 'signup', email })` to produce a fresh confirmation link, then sends it via Resend using the existing `noreply@play.fgn.gg` sender and FGN branding.

2. **Invoke it once** for `Distantoneta@gmail.com` to deliver the confirmation email.

3. **Optionally keep** the function for future use by admins (e.g., a "Resend Confirmation" button on the Admin Users page), or delete it after use.

### Files
- **New**: `supabase/functions/resend-confirmation/index.ts` — accepts `{ email }`, generates a new signup confirmation link via the Auth Admin API, sends a branded email via Resend
- **Updated**: `supabase/config.toml` — register the new function with `verify_jwt = false`

### After deployment
I will immediately invoke the function for `Distantoneta@gmail.com` so the email is sent right away.

