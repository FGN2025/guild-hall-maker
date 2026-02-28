

## Fix Email Verification and Notification Delivery

### Problem Summary

Three issues are preventing email delivery:

1. **Email auto-confirm is enabled** -- signups bypass email verification entirely (users are logged in immediately with no confirmation email sent)
2. **Resend "from" address uses test domain** -- `onboarding@resend.dev` only delivers to your own Resend account email, not real users
3. **No custom auth email templates** -- default generic templates would be used even if verification were re-enabled

### Plan

#### Step 1: Disable email auto-confirm

Turn off auto-confirm so new signups must verify their email before they can log in. This restores the standard signup flow: user registers, receives a verification email, clicks the link, then can sign in.

(Existing admin accounts are unaffected -- they are already confirmed.)

#### Step 2: Set up custom auth email templates

Scaffold branded FGN email templates for all auth emails (signup confirmation, password reset, magic link, etc.) so they match the platform's look and feel instead of using generic defaults.

#### Step 3: Verify fgn.gg domain in Resend (manual step)

You will need to verify your sending domain in Resend so transactional emails (prize updates, challenge alerts, tournament reminders) can be delivered to all users -- not just your own email. This involves adding DNS records provided by Resend.

#### Step 4: Update the notification edge function "from" address

Change `send-notification-email` to use a verified fgn.gg address (e.g., `noreply@fgn.gg`) instead of `onboarding@resend.dev`.

---

### Technical Details

- **Auth config change**: Use the configure-auth tool to set `autoConfirmEmail: false`
- **Email templates**: Use `scaffold_auth_email_templates` tool, then apply FGN brand colors (cyan `#00f0ff` primary, dark background theme) and deploy via `deploy_edge_functions`
- **Edge function update**: Modify line in `supabase/functions/send-notification-email/index.ts` changing `from: "FGN <onboarding@resend.dev>"` to `from: "FGN <noreply@fgn.gg>"` (once domain is verified)
- **Domain verification**: Manual step in Resend dashboard -- add DNS TXT/CNAME records for fgn.gg

