
I reproduced the diagnosis path and this is no longer primarily a `match-legacy-user` crash issue. The current blocker is a confirmation UX dead-end.

What I found:
- `darcylorincz@gmail.com` exists in authentication data and is still **unconfirmed** (`email_confirmed_at = null`).
- The signup flow’s custom confirmation screen (`Auth.tsx`, `signupStep === "confirmation"`) does not actively recover users who are unconfirmed and retrying.
- If the user retries signup with the same email, the code switches to login (`isRepeatedSignup`) instead of offering a reliable “resend + continue” path.
- This creates the “confirmation screen loop” you reported.

Implementation plan

1) Make `/auth` confirmation step self-recovering
- File: `src/pages/Auth.tsx`
- Add two actions on the confirmation screen:
  - **Resend confirmation email** (calls backend function `resend-confirmation` with `{ email }`).
  - **I verified, continue** (attempt sign-in with current credentials; on success navigate to dashboard).
- Keep “Go to Sign In” as fallback.

2) Fix repeated-signup behavior (core loop fix)
- In `isRepeatedSignup` branch:
  - Do **not** force-switch to login immediately.
  - Keep user in confirmation flow (`signupStep = "confirmation"`), show clear message like “Account already exists but needs verification,” and trigger resend CTA.
- This ensures users can recover even if they missed the first email.

3) Add auth-state redirect on Auth page
- File: `src/pages/Auth.tsx`
- Add effect that watches auth state (via `useAuth`):
  - If authenticated + confirmed → redirect to `/dashboard`.
  - If authenticated + unconfirmed → redirect to `/confirm-email`.
- This removes stale UI state when verification happens in another tab/window.

4) Keep legacy-match call non-blocking (as-is) but reduce noise
- File: `supabase/functions/match-legacy-user/index.ts`
- Optional hardening: only attempt token introspection when `Authorization` looks like a real JWT; otherwise skip directly to body fallback.
- This avoids unnecessary `/user bad_jwt` noise without changing behavior.

Technical details (for implementation)
- No schema migration required.
- No RLS policy changes required.
- Primary code touchpoints:
  - `src/pages/Auth.tsx` (main fix)
  - `supabase/functions/match-legacy-user/index.ts` (optional log-noise guard)
- Existing backend function `resend-confirmation` is already available and suitable for unauthenticated recovery flow.

Validation checklist
1. New signup -> lands on confirmation screen -> receives email -> click link -> app exits loop and reaches dashboard/next gate.
2. Retry signup with same unconfirmed email -> stays in confirmation flow (not trapped), resend works.
3. “I verified, continue” works after confirmation and no longer loops.
4. Test end-to-end on preview domain and mobile viewport.
