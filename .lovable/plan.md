

## Diagnosis: Confirmation Emails Not Delivering

### Root Issue

The `auth-email-hook` edge function logs show `message_id: undefined` on every signup attempt. The hook runs successfully and calls `sendLovableEmail`, but the response contains no `message_id` — meaning the email was never actually sent.

This is the **Lovable managed auth email flow** (not Resend). The `send-notification-email` function (which uses Resend directly) handles transactional notifications and works fine. The `auth-email-hook` handles signup confirmation, password reset, etc. via the Lovable Email API.

### What's Working
- Domain `notify.fgn.gg` is **verified and active**
- Custom domain `play.fgn.gg` is configured
- The hook receives the webhook correctly, renders the template, and calls `sendLovableEmail`
- The `send-notification-email` (Resend-based) function works for transactional emails

### What's Not Working
- `sendLovableEmail` returns `{ message_id: undefined }` — the Lovable Email API accepted the call but didn't return a message ID, suggesting a silent failure in delivery

### Plan

**1. Add error-level logging to `auth-email-hook`**

Capture the full response from `sendLovableEmail` so we can see exactly what the API returns. Currently only `message_id` is logged, which hides any error details.

In `supabase/functions/auth-email-hook/index.ts`, after the `sendLovableEmail` call, log the full `result` object:
```typescript
console.log('sendLovableEmail full result:', JSON.stringify(result));
```

**2. Redeploy `auth-email-hook`**

Deploy the updated function so the next signup attempt produces detailed logs.

**3. Verify the `FROM_DOMAIN` matches the verified domain**

Currently the function uses:
- `SENDER_DOMAIN = "notify.fgn.gg"` 
- `FROM_DOMAIN = "notify.fgn.gg"`
- From address: `guild-hall-maker <noreply@notify.fgn.gg>`

The verified domain is `notify.fgn.gg` — this matches. No change needed here.

**4. Check `SITE_NAME` in From address**

The current `SITE_NAME` is `"guild-hall-maker"` which is the Lovable project name, not "FGN". This should be updated to `"FGN"` to match the brand and be consistent with the Resend-based emails that use `"FGN <noreply@fgn.gg>"`.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/auth-email-hook/index.ts` | Update `SITE_NAME` to `"FGN"`, add full result logging for debugging |

After deploying, a test signup will produce detailed logs showing exactly why `message_id` is undefined, allowing us to fix the root cause.

