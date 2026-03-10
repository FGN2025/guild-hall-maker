

## Current Invite Registration Flow

Here's what happens today when someone like jwiebe@drtel.com is invited:

1. **Invite email sent** — "You've been invited to join DRN on FGN" (via `send-tenant-invite`)
2. **User clicks "Sign Up & Join"** → lands on `/auth?invite=true&email=jwiebe@drtel.com`
3. **User registers** → toast says "Check your email to confirm your account!"
4. **Auth confirmation email** — standard "Confirm your email" (via `auth-email-hook`)
5. **User clicks confirm link** → account activated, `claim_tenant_invitations` trigger assigns the role
6. ❌ **No "Welcome, you're now an Admin of DRN" confirmation email**

The gap: after registration and email verification, the user has no email confirming their role was assigned and they're ready to go.

---

## Plan: Send a Registration Confirmation Email

### 1. Create a new edge function `send-invite-welcome`

A Resend-powered edge function (matching the existing `send-tenant-invite` pattern) that sends a branded confirmation email:

- **Subject**: "Welcome to DRN — You're in!"
- **Body**: Confirms their role (e.g., "You've been added as an **Admin** of **DRN**"), with a CTA button linking to the tenant dashboard
- Uses the same FGN cyberpunk branding as the invite email

### 2. Trigger the email from the `claim_tenant_invitations` database function

Update the existing trigger function so that after it claims an invitation and inserts into `tenant_admins`, it calls `net.http_post` to invoke the new edge function with the user's email, tenant name, and role. This ensures the welcome email fires automatically at the exact moment the role is assigned — no frontend changes needed.

Alternatively, if `pg_net` isn't available, the welcome email can be triggered from the Auth page frontend code right after signup succeeds and the profile is created (since the trigger fires on profile insert).

### 3. Register the function in `supabase/config.toml`

Add `verify_jwt = false` entry for the new function.

### Files changed
- **New**: `supabase/functions/send-invite-welcome/index.ts` — branded welcome email
- **Modified**: `src/pages/Auth.tsx` — after successful invite signup, call `send-invite-welcome` with email, tenant name, and role (frontend trigger approach)

