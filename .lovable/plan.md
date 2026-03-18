
Issue assessment

I checked the auth flow and the current data for darcy@wtfast.com. The problem is not a missing invite email record — it is a broken invite/confirmation handoff.

What I found
- Darcy already has an existing auth account, and it is already confirmed.
- There is an unclaimed Consolidated tenant invitation for darcy@wtfast.com.
- There is no tenant_admins row for Darcy yet, which means the invite was never claimed.
- In `src/pages/Auth.tsx`, repeated signup is treated as “existing but unconfirmed” for all cases and sends the user to the “You’re Almost There” screen.
- That assumption is wrong for Darcy: he is already confirmed, so he should be directed to sign in, not asked to wait for another confirmation email.
- The “I’ve Verified — Continue” button on that same screen signs the user in, but does not call `claim_pending_invitations`, so even a successful sign-in from that screen can still leave the tenant role unclaimed.
- The invite confirmation screen on `/auth` also lacks the polling/auto-redirect logic used on `/confirm-email`, so it can visually look stuck even after verification.

Plan to fix

1. Fix repeated-signup detection in `src/pages/Auth.tsx`
- When signup returns an existing user, distinguish:
  - already confirmed existing account → switch to sign-in guidance
  - unconfirmed existing account → stay on confirmation/resend flow
- Use the returned user state if available; if that is not reliable enough, add a lightweight backend lookup by email for confirmation status.

2. Claim tenant invites after “I’ve Verified — Continue”
- In the confirmation-screen sign-in handler, call `claim_pending_invitations` after successful sign-in, just like the normal login flow already does.
- Then route invited staff to the correct post-login destination.

3. Make the invite confirmation screen self-healing
- Add confirmation polling / session refresh logic to the `/auth` confirmation step so it automatically exits once the account is verified, instead of waiting for the user to guess the next step.

4. Clean up resend behavior and messaging
- If the account is already confirmed, do not tell the user another confirmation email is coming.
- Show accurate messaging like “Your account already exists — sign in to claim your invite.”
- Keep resend only for genuinely unconfirmed accounts.

5. Verify Darcy’s exact scenario
- After the code fix, Darcy’s next successful sign-in should automatically claim the Consolidated invite and create the tenant admin membership.
- No database migration should be needed for this fix.

Files likely involved
- `src/pages/Auth.tsx` — main fix
- `src/pages/ConfirmEmail.tsx` — optional behavior parity / resend cleanup
- `src/contexts/AuthContext.tsx` — only if session refresh handling needs tightening
- Possibly one small backend helper only if confirmation-state lookup by email is needed

Expected outcome
- Existing invited users like Darcy will no longer be trapped on the confirmation screen.
- Unconfirmed invited users will still get the correct resend/verify flow.
- Successful sign-in from the invite flow will actually claim the pending tenant invitation and unlock tenant access for Consolidated.
