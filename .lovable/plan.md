
Deep assessment (current state)

1) Evidence from backend data
- New account `darcy@motoworlds.com` exists in auth users with `email_confirmed_at = null` (confirmation required is active).
- A `confirmation_token` was generated in `auth.one_time_tokens` for that user.
- This proves signup + token creation are working, but delivery is failing in the mail send stage.

2) Evidence from code
- `auth-email-hook` is deployed and reachable (returns 401 invalid signature when called without signed payload).
- Hook currently logs success even when `message_id` is missing:
  - `console.log('Email sent successfully', { message_id: result.message_id })`
  - It returns 200 even if `message_id` is undefined.
- This can mask delivery failures and make the auth pipeline look “successful” while no email is actually sent.
- Domain mismatch risk exists:
  - Hook hardcodes `SENDER_DOMAIN = notify.fgn.gg` / `FROM_DOMAIN = notify.fgn.gg`
  - Workspace verified domain listing shows `fgn.gg` as active verified domain.
  - Even if subdomain appears verified in status checks, this mismatch is a common production failure point.

3) Likely root causes (ranked)
- Primary: hook treats missing `message_id` as success (silent failure path).
- Secondary: sender domain configuration mismatch (`notify.fgn.gg` vs verified project sender domain).
- Tertiary: stale/partial custom-email setup state (hook deployed but backend email setup not fully reconciled).

Recommended fix plan (production-focused)

Phase A — Make failure explicit (no more silent success)
- Update `supabase/functions/auth-email-hook/index.ts`:
  - If `!result?.message_id`, return 502 with structured error and `run_id` (do not return success).
  - Keep full result logging already added.
  - Log: `run_id`, `emailType`, recipient domain, callback URL host, sender domain.
- Why: gives immediate truth in logs and prevents false “success” status.

Phase B — Align sender identity with verified production domain
- In `auth-email-hook` constants:
  - Set sender/from domain to the exact domain currently verified/active for auth email sending (recommend `fgn.gg` unless email settings confirm `notify.fgn.gg` as active sender domain for this project).
  - Keep display name `FGN`.
- Also align all auth email links to production app domain (`play.fgn.gg`) for user trust/consistency.

Phase C — Reconcile managed auth email setup
- Re-run managed auth template scaffold + redeploy `auth-email-hook` to ensure backend wiring is fully in sync.
- This step addresses hidden setup drift (common after domain or template evolution).

Phase D — End-to-end verification protocol
- Run 3 real tests with fresh addresses (not previously registered):
  1. New signup confirmation
  2. Resend confirmation (if applicable in flow)
  3. Password recovery email
- For each, verify:
  - token row created
  - hook invocation present
  - non-empty `message_id`
  - inbox delivery (and spam placement)
- Exit criteria for production-ready:
  - 3/3 tests produce non-empty `message_id` and actual inbox receipt within SLA window.

Phase E — Optional hardening
- Add a lightweight “email delivery diagnostics” admin panel row/log for last auth email attempt status (success/failure + run_id + timestamp), so issues are visible without digging into raw logs.

Files/settings to touch in implementation
- `supabase/functions/auth-email-hook/index.ts`
  - enforce non-empty `message_id`
  - structured diagnostics
  - sender/from domain alignment
  - production domain links
- Auth email setup state (managed email configuration reconciliation)
- No DB migration required for this fix.

Why this plan will fix your specific issue
- Your current flow already creates confirmation tokens, so auth signup is not broken.
- The failure is in confirmation email dispatch/acknowledgement.
- This plan removes silent success, standardizes sender configuration, and rebinds managed setup so registration confirmation works reliably in production.
