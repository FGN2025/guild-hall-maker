

# Streamlined Signup for Invited Tenant Managers

## Problem

Invited managers click "Sign Up & Join" in the email and land on the normal signup flow, which requires ZIP code verification. This is unnecessary — they were explicitly invited by an admin and don't need geographic gating.

## Approach

Add an invite-aware route that skips the ZIP and subscriber verification steps, going straight to the account creation form.

### 1. Update invite email CTA link

In `supabase/functions/send-tenant-invite/index.ts`, change the link from `/auth` to `/auth?invite=true&email={email}` so the Auth page knows to skip ZIP verification.

### 2. Update Auth page to detect invite flow

In `src/pages/Auth.tsx`:
- Read `invite` and `email` query params from the URL
- If `invite=true`, default to signup mode and set `signupStep` to `"account"` (skipping ZIP and subscriber steps)
- Pre-fill the email field with the invited email (and optionally make it read-only)
- Hide the "Back to location check" button when in invite flow

### 3. No database changes needed

The `claim_tenant_invitations` trigger already handles auto-assigning the tenant role on profile creation by matching the email. The invite flow just needs to bypass the frontend ZIP gate.

| File | Change |
|---|---|
| `supabase/functions/send-tenant-invite/index.ts` | Update CTA href to include `?invite=true&email={email}` |
| `src/pages/Auth.tsx` | Read query params; skip to account step and pre-fill email when `invite=true` |

