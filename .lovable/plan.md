

## Implement FGN Academy Challenge Sync Integration

### Steps

1. **Add `FGN_ACADEMY_API_KEY` secret** — Use `add_secret` tool to prompt for the key value

2. **Database migration** — Add `academy_synced` (boolean default false) and `academy_synced_at` (timestamptz) columns to `challenge_completions`

3. **Create `sync-to-academy` edge function** — Accepts `{ user_id, challenge_id, awarded_points }`, resolves user email, checks tenant has active `fgn_academy` integration, POSTs to academy endpoint with `X-App-Key` header, updates `academy_synced` flag, logs to `ecosystem_sync_log`

4. **Wire into challenge approval flow** — Add fire-and-forget call to `sync-to-academy` in `ModeratorChallenges.tsx` and `AdminChallenges.tsx` after challenge completion INSERT

5. **Add FGN Academy integration card** — Add `fgn_academy` provider option to Tenant Settings integrations page so tenant admins can enable/disable the sync

### Files Changed

| File | Change |
|---|---|
| Migration SQL | Add 2 columns to `challenge_completions` |
| `supabase/functions/sync-to-academy/index.ts` | New edge function |
| `supabase/config.toml` | Add `verify_jwt = false` for sync-to-academy |
| `src/pages/moderator/ModeratorChallenges.tsx` | Fire-and-forget sync call after approval |
| `src/pages/admin/AdminChallenges.tsx` | Same sync call |
| Tenant Settings integrations section | Add FGN Academy card |

