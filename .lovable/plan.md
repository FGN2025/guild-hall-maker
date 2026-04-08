
## Fix password reset flow and verify unintended tenant access

### What’s actually happening
1. The password reset link is reaching `/reset-password`, but the page is showing a false “Invalid Reset Link” state because it only trusts:
   - the `PASSWORD_RECOVERY` auth event, or
   - `type=recovery` in the URL hash.
2. On hosted auth flows, the token/hash can be consumed and cleared before `ResetPassword.tsx` checks it, so the page ends up at `/reset-password#` and incorrectly renders the error.
3. The later appearance of the Tenant area is a separate issue:
   - I do **not** see any reset-password code that grants admin/tenant access.
   - Tenant access is shown only when a `tenant_admins` row already exists for that user.
   - The most likely source is an existing tenant admin record or a previously claimed tenant invitation, not the reset flow itself.

## Implementation plan

### 1) Make the reset page accept a valid recovery session
Update `src/pages/ResetPassword.tsx` so it does not rely only on the hash/event.

Proposed behavior:
- Add a small “checking reset link” state on mount.
- Treat the page as valid if **any** of these are true:
  - hash contains recovery markers,
  - auth event is `PASSWORD_RECOVERY`,
  - a current authenticated session already exists while the user is on `/reset-password`.
- Only show “Invalid Reset Link” after those checks fail.

This removes the false error screen when the token was already exchanged successfully.

### 2) Keep the user on the reset form until password update is completed
In `src/pages/ResetPassword.tsx`:
- do not show the invalid state while recovery/session detection is still resolving,
- let the user set the new password immediately once the session is present,
- after successful password update, redirect to the normal player experience.

### 3) Audit why darcy@wtfast.com is seeing tenant access
Do a backend data check for that email and review:
- `tenant_admins`
- `tenant_invitations`
- any claimed invitation history tied to that email

Expected outcome:
- If the user is truly designated as tenant staff, the current UI is behaving correctly.
- If not, remove the unintended tenant assignment and any stale pending invite so future logins stay player-only.

### 4) Do not change role gating unless the audit proves bad data
The current app logic appears correct:
- Tenant UI is only exposed when `useTenantAdmin()` finds a `tenant_admins` record.
- I would **not** change `AuthContext`, `TenantRoute`, or sidebar role checks as the first fix.
- This looks like a data assignment problem, not a client-side privilege escalation problem.

### 5) Optional hardening for future safety
If you want to prevent this class of confusion going forward, I recommend a follow-up change:
- stop silently claiming staff invitations on login,
- instead require an explicit “Accept tenant staff invite” confirmation step.

That keeps normal subscribers from being elevated by surprise if an old or mistaken invitation exists for their email.

## Files / areas involved
- `src/pages/ResetPassword.tsx` — primary fix
- backend data audit for `tenant_admins` and `tenant_invitations`
- no role-routing code changes unless the audit shows a real logic bug

## Technical details
```text
Current failure:
reset email -> recovery link opens -> auth client exchanges token -> URL hash cleared
-> ResetPassword only checks hash/event -> false "Invalid Reset Link"

Planned fix:
reset email -> recovery link opens -> page checks hash OR PASSWORD_RECOVERY OR active session
-> show reset form -> update password -> send user to normal app flow
```

## Validation steps
1. Request reset from the public URL.
2. Open the email link.
3. Confirm `/reset-password` shows the password form immediately, not the invalid-link card.
4. Set a new password successfully.
5. Confirm the user lands in normal player access.
6. Verify whether `darcy@wtfast.com` truly has a tenant admin assignment; if not, remove it and retest login.
