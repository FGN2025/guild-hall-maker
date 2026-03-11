

## Fix: Invite Flow for Existing Users

### Root Cause

The issue has two parts:

1. **Repeated signup silently fails.** The user `darcylorincz@gmail.com` already has a confirmed account (created 2026-02-28). When they click "Sign Up & Join" from the invite email, `supabase.auth.signUp()` returns a `user_repeated_signup` event with HTTP 200 but creates no new user and sends no confirmation email. The frontend shows the "We've sent a confirmation email" screen, but nothing was actually sent.

2. **Invitation never gets claimed.** The `claim_tenant_invitations` trigger fires `AFTER INSERT ON public.profiles`. Since the user already has a profile row, the trigger never fires, and the invitation remains unclaimed (`claimed_at` is NULL).

### Plan

#### 1. Database: Create an RPC to claim invitations on demand

Create a new database function `claim_pending_invitations()` that an authenticated user can call at any time. It looks up their email, finds unclaimed `tenant_invitations`, inserts into `tenant_admins`, marks them claimed, and fires the welcome email — identical logic to the existing trigger but callable on-demand.

```sql
CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _inv RECORD;
  _email TEXT;
  _tenant_name TEXT;
  _uid UUID := auth.uid();
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email IS NULL THEN RETURN; END IF;

  FOR _inv IN
    SELECT * FROM public.tenant_invitations
    WHERE lower(email) = lower(_email) AND claimed_at IS NULL
  LOOP
    INSERT INTO public.tenant_admins (tenant_id, user_id, role)
    VALUES (_inv.tenant_id, _uid, _inv.role)
    ON CONFLICT DO NOTHING;
    UPDATE public.tenant_invitations SET claimed_at = now() WHERE id = _inv.id;

    SELECT name INTO _tenant_name FROM public.tenants WHERE id = _inv.tenant_id;
    PERFORM net.http_post(
      url := 'https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/send-invite-welcome',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon-key>"}'::jsonb,
      body := jsonb_build_object('email', _email, 'tenantName', COALESCE(_tenant_name,'your organization'), 'role', _inv.role)
    );
  END LOOP;
END;
$$;
```

#### 2. Frontend: Auth page — detect existing user and switch to sign-in

**`src/pages/Auth.tsx`** changes:

- When `isInviteFlow` is true and the user submits the signup form, check if the `signUp` response indicates a repeated signup (user exists with `email_confirmed_at` already set, or `data.user` has `identities` array empty/null — Supabase's signal for a duplicate).
- If the user already exists: show a message like "You already have an account. Please sign in to claim your invitation." and switch to the login form with the email pre-filled.
- After successful **sign-in** on an invite flow: call `supabase.rpc('claim_pending_invitations')` to claim the pending invitation, then redirect to `/dashboard`.

#### 3. Frontend: Also claim on regular login

**`src/pages/Auth.tsx`** — after any successful `signInWithPassword`, call `supabase.rpc('claim_pending_invitations')` in the background. This handles cases where a user receives an invite but logs in normally (not via the invite link). The RPC is a no-op if there are no pending invitations.

#### 4. Files Changed

| File | Change |
|------|--------|
| Migration SQL | New `claim_pending_invitations()` RPC |
| `src/pages/Auth.tsx` | Detect repeated signup, switch to sign-in, call RPC after login |

