

## Assessment: Initial Confirmation Email Fails Silently

**Root cause identified.** The `auth-email-hook` (Lovable's managed auth email system) is failing on every signup attempt with:

```
403: {"type":"no_matching_sender","message":"No sender domain matches the requested sender domain"}
```

The hook sends from `noreply@fgn.gg` via the Lovable Email API, but the API rejects it despite `fgn.gg` being listed as verified. This appears to be a platform-level mismatch — the hook has been failing consistently across all recent signup attempts.

**Why the second request works:** The "Resend Confirmation Email" button calls the `resend-confirmation` edge function, which bypasses the Lovable email system entirely and sends directly via the Resend API from `noreply@play.fgn.gg`. That path works reliably.

**This is a real bug.** Every new user will always need to manually request a resend.

## Recommended Fix

Since the Lovable managed email path (`auth-email-hook`) has an unresolvable domain mismatch, the most reliable fix is to **automatically call the working `resend-confirmation` function immediately after signup succeeds** as a fallback.

### Changes

**`src/pages/Auth.tsx`** — After a successful `supabase.auth.signUp()` call, immediately invoke the `resend-confirmation` edge function with the user's email. This ensures the user gets a branded confirmation email via the working Resend path, even though the auth-email-hook silently fails.

```typescript
// Right after successful signup, fire the working resend path
await supabase.functions.invoke("resend-confirmation", {
  body: { email: signupEmail },
});
```

This is a single-line addition to the existing signup success handler. No other files need to change.

### Why this approach

- Zero risk: the `resend-confirmation` function is already battle-tested and working
- No platform dependency: sidesteps the Lovable Email API domain issue entirely  
- User experience: confirmation email arrives immediately without manual action
- The auth-email-hook will still fire (and fail silently) — this just ensures a working email always goes out

### Separately (informational)

The `auth-email-hook` domain mismatch (`fgn.gg` verified but rejected) may be a Lovable platform bug worth reporting. The fix above makes the system resilient regardless.

