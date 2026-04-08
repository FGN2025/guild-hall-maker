

## Fix Password Reset Email Delivery

### Root Cause

The auth-email-hook uses the **old direct-send pattern** (`sendLovableEmail` + `callback_url`). The email API has migrated to a queue-based response format — it now returns `{"success":true, "status":"queued", "workflow_id":"..."}` instead of `{"message_id":"..."}`. The hook checks for `message_id`, doesn't find it, and returns a **502 error** to Supabase Auth.

This causes Supabase Auth to **retry the webhook 5+ times** for every single password reset request (visible in logs). The email may or may not eventually deliver from the queue, but the retries create duplicate sends and token confusion — leading to the `otp_expired` error the user saw.

Additionally, the email queue infrastructure (`enqueue_email` RPC, pgmq queues, `process-email-queue` cron) does not exist in the database, so upgrading to the queue pattern requires setting that up first.

### Fix — Upgrade auth-email-hook to Queue-Based Pattern

This is a 3-step process using built-in tooling:

1. **Set up email queue infrastructure** — Call `setup_email_infra` to create pgmq queues, RPC wrappers, cron job, and supporting tables (`email_send_log`, `email_send_state`, etc.)

2. **Re-scaffold auth-email-hook** — Call `scaffold_auth_email_templates` with `confirm_overwrite: true` to upgrade the hook from the old `sendLovableEmail` pattern to the new `enqueue_email` RPC pattern. This preserves the existing branded templates (recovery, signup, etc.) while replacing the broken send logic.

3. **Re-apply brand styling** — After scaffolding, re-read each template file and restore the FGN branding (dark header, cyan button, Orbitron font, logo) since the scaffold tool resets templates to defaults.

4. **Deploy** — Redeploy `auth-email-hook` with the updated code.

### What This Fixes

- Recovery emails will be reliably enqueued and delivered via the queue dispatcher
- No more false 502 errors causing retry storms
- Automatic retry on rate-limits or transient failures
- Dead-letter routing for permanently failed sends
- The `otp_expired` issue goes away because only one email is sent per request

### Files Changed

| File | Change |
|------|--------|
| Database (via setup_email_infra) | Create pgmq queues, email tables, cron job |
| `supabase/functions/auth-email-hook/index.ts` | Re-scaffold to queue-based pattern |
| `supabase/functions/_shared/email-templates/*.tsx` | Restore FGN branding after scaffold |

