

## Change Email Sender Domain to play.fgn.gg

Since `play.fgn.gg` is the verified domain on Resend, we need to update the `from` address in all three edge functions that send emails via Resend.

### Change

Replace `noreply@fgn.gg` with `noreply@play.fgn.gg` in:

1. **`supabase/functions/send-notification-email/index.ts`** (line 292)
2. **`supabase/functions/send-tournament-email/index.ts`** (line 195)
3. **`supabase/functions/send-tenant-invite/index.ts`** (line 65)

All three files: `"FGN <noreply@fgn.gg>"` → `"FGN <noreply@play.fgn.gg>"`

