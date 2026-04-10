

## Send admin notification emails for new Provider Inquiries and Access Requests

### Summary
When a new provider inquiry is submitted or a new access request is created, send an email notification to darcy@fgn.gg and mj@fgn.gg.

### How it works

**1. Update `send-notification-email` edge function**
- Add a new type `new_provider_inquiry` to the Payload interface
- When triggered, send a styled notification email to both `darcy@fgn.gg` and `mj@fgn.gg` with the inquiry details (name, email, role, message)

**2. Update `ForProviders.tsx` contact form submission**
- After the successful insert into `provider_inquiries`, invoke `send-notification-email` with type `new_provider_inquiry` and the form data as `record`

**3. Update Access Requests notification**
- The existing `access_request_new` type currently sends to all admin users by looking up `user_roles`. Change it to instead send directly to `darcy@fgn.gg` and `mj@fgn.gg` (or add them as explicit recipients alongside the admin lookup — whichever you prefer). This ensures the two specific people always get notified regardless of their admin role status.

### Files touched
| File | Change |
|------|--------|
| `supabase/functions/send-notification-email/index.ts` | Add `new_provider_inquiry` type; update `access_request_new` to include darcy@ and mj@ |
| `src/pages/ForProviders.tsx` | Invoke notification email after inquiry insert |

