

## Fix Resend Email Integration — 5 Issues

Now that `fgn.gg` is verified on Resend, here are the code fixes to make email delivery fully operational.

### Changes

**1. `supabase/config.toml`** — Register 3 missing edge functions
Add `verify_jwt = false` entries for `send-notification-email`, `send-tenant-invite`, and `tournament-reminders`.

**2. `supabase/functions/send-notification-email/index.ts`** — Two fixes
- Add `bypass_code` to the destructuring on line 36 (currently missing, causing access-request-approved emails to silently fail)
- Add `response.ok` checking after each Resend API call in the batch loop, with error logging and a `failed` count in the response

**3. `supabase/functions/send-tournament-email/index.ts`** — Add response error handling
Check `response.ok` after the Resend fetch call and log failures.

**4. `supabase/functions/ecosystem-magic-link/index.ts`** — Remove unused `RESEND_API_KEY` line
Dead code cleanup — the function never sends email.

**5. `supabase/functions/tournament-reminders/index.ts`** — No Resend calls here
This function only inserts into the `notifications` table (in-app). No email fix needed.

### Files to Edit
- `supabase/config.toml`
- `supabase/functions/send-notification-email/index.ts`
- `supabase/functions/send-tournament-email/index.ts`
- `supabase/functions/ecosystem-magic-link/index.ts`

