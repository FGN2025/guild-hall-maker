

## Quick Fix: Direct Magic Link Redirect (Skip Email)

Instead of sending an email via Resend (which fails due to unverified domain), the edge function will return the magic link URL directly, and the frontend will open it in a new tab for instant access.

### Changes

**1. Edge Function (`supabase/functions/ecosystem-magic-link/index.ts`)**
- Remove the Resend email-sending block entirely
- Return `{ success: true, magicLink: "<url>" }` in the response instead of sending an email

**2. Frontend Hook (`src/hooks/useEcosystemAuth.ts`)**
- Update `requestMagicLink` to read `magicLink` from the response
- Open the URL in a new browser tab via `window.open()`
- Change the success toast to say "Opening [App Name]..." instead of "Check your email"

### What stays the same
- All authentication, role checks, and token generation logic in the edge function remain unchanged
- The `ecosystem_auth_tokens` table and token validation flow are untouched
- Sidebar UI in both Admin and Tenant panels stays as-is

### Pre-launch note
Before launch, verify the `fgn.gg` domain in Resend, update the `from` address, and revert to email-based delivery for better security.

