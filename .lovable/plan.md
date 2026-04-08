

## Fix Password Reset Emails — Sender Domain Mismatch

### Root Cause

The password reset emails are **not being delivered at all**. The edge function logs confirm every attempt fails with:

```
403 {"type":"no_matching_sender","message":"No sender domain matches the requested sender domain"}
```

The `auth-email-hook` has `SENDER_DOMAIN = "fgn.gg"` (line 39), but the verified email domain is `notify.fgn.gg`. The email API rejects every send because `fgn.gg` is not a verified sender domain — only the subdomain `notify.fgn.gg` is.

This affects **all auth emails** — password reset, signup confirmation, magic links, everything.

### Fix

**File: `supabase/functions/auth-email-hook/index.ts`** — Change line 39:

```typescript
// Before
const SENDER_DOMAIN = "fgn.gg"

// After
const SENDER_DOMAIN = "notify.fgn.gg"
```

Then redeploy the edge function.

### Additional Improvement — Upgrade to Queue-Based Sending

The current auth-email-hook uses the old direct-send pattern (`sendLovableEmail` + `callback_url`). This means failed sends have no retry mechanism — the email is lost. The newer queue-based pattern enqueues emails to pgmq with automatic retries, rate-limit handling, and dead-letter routing.

After fixing the sender domain (the critical fix), I will re-scaffold the auth-email-hook to use the queue pattern, preserve the existing branded templates, and redeploy.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/auth-email-hook/index.ts` | Fix `SENDER_DOMAIN` from `fgn.gg` to `notify.fgn.gg`, then redeploy |

### Impact

This fix unblocks:
- Password reset for all users (including the ~4,400 legacy users)
- Signup confirmation emails
- Magic link emails
- All other auth emails

