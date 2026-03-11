

## Assessment: Auth Email Flows and Conflicts

### Current Architecture — Two Competing Email Systems

The project has **two separate email delivery paths** for authentication-related emails:

1. **Managed auth-email-hook** (Lovable's built-in system via `fgn.gg` domain) — handles initial signup confirmation, password recovery, magic links. Sends from `noreply@fgn.gg` via the Lovable Email API.

2. **Custom Resend edge functions** — `resend-confirmation`, `send-tenant-invite`, `send-invite-welcome`. Send from `noreply@play.fgn.gg` via Resend API.

### Flow Analysis

#### Flow 1: Brand-New User (Normal Signup)
1. User completes ZIP check → creates account via `signUp()`
2. Auth-email-hook fires → sends confirmation email from `noreply@fgn.gg` ✅
3. User lands on confirmation screen in `Auth.tsx`
4. If they click "Resend" on `ConfirmEmail.tsx` page → calls `resend-confirmation` edge function → sends from `noreply@play.fgn.gg` via Resend
5. **Potential issue**: Two different sender addresses for the same confirmation flow. User may not recognize the second email.

#### Flow 2: Invited User (New Account)
1. Admin invites email → `send-tenant-invite` sends invite from `noreply@play.fgn.gg`
2. User clicks invite link → `Auth.tsx` with `?invite=true&email=...` → skips ZIP check
3. User signs up → auth-email-hook sends confirmation from `noreply@fgn.gg` ✅
4. `claim_tenant_invitations` trigger fires on profile insert → claims invite → sends welcome email from `noreply@play.fgn.gg`
5. User lands on confirmation screen → if they click "Resend" → same issue as Flow 1

#### Flow 3: Invited User (Existing Account) — Recently Fixed
1. User clicks invite link → tries to sign up → repeated signup detected → switched to login
2. User signs in → `claim_pending_invitations()` RPC fires → claims invite → sends welcome email ✅
3. No confirmation issue since user is already confirmed ✅

### Identified Issues

#### Bug 1: `ConfirmEmail` sends wrong parameter name
**`ConfirmEmail.tsx` line 48** sends `{ userId: user.id }` but `resend-confirmation/index.ts` line 26 expects `{ user_id }`. The resend function receives `undefined` for `user_id`, falls through to requiring `email` (also undefined), and returns a 400 error. **The "Resend Confirmation Email" button on the confirm-email page is completely broken.**

#### Bug 2: Dual sender addresses create confusion
Initial confirmation comes from `noreply@fgn.gg` (auth-email-hook) but resends come from `noreply@play.fgn.gg` (Resend). This inconsistency may cause spam filter issues or user confusion.

#### Bug 3: `resend-confirmation` uses `generateLink({ type: "signup" })` which can re-confirm already-confirmed users
For users who confirmed but somehow land on the confirm page, this generates a new signup link which is semantically wrong.

### Recommended Plan

#### 1. Fix the parameter name bug in `ConfirmEmail.tsx`
Change `{ userId: user.id }` to `{ user_id: user.id }` so the resend function actually receives the user ID.

#### 2. Consolidate resend onto built-in auth
Replace the custom `resend-confirmation` edge function call with Supabase's built-in `supabase.auth.resend()` method. This uses the same auth-email-hook pipeline, keeping the sender address consistent (`noreply@fgn.gg`).

**`ConfirmEmail.tsx` change:**
```typescript
const handleResend = async () => {
  if (!user?.email) return;
  setResending(true);
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });
    if (error) throw error;
    toast.success("Confirmation email sent! Check your inbox.");
  } catch {
    toast.error("Failed to resend. Please try again.");
  } finally {
    setResending(false);
  }
};
```

This ensures all confirmation emails flow through `auth-email-hook` → same branded template, same sender domain, no conflicts.

#### 3. Keep the `resend-confirmation` edge function for admin use only
The admin panel's "Resend Confirmation" button in `AdminUsers` may still call this function for unconfirmed users. That's fine as an admin tool — it uses `generateLink` with service role access which works even for edge cases. No change needed there.

#### Summary of Changes

| File | Change |
|------|--------|
| `src/pages/ConfirmEmail.tsx` | Replace custom edge function call with `supabase.auth.resend()` |

One file, one change. Eliminates the parameter bug and the dual-sender conflict for end users.

