# Add observability + retry to Discord tournament role assignment

Give admins a persistent trail and self-healing behavior for `assign-tournament-role`, matching the pattern already used by `discord-send-message` / `discord_send_log`.

## What changes

### 1. New table `discord_role_action_log` (migration)
One row per assignment attempt (success, skip, or failure).

Columns (beyond id/timestamps):
- `user_id uuid` — target player
- `tournament_id uuid` — nullable (future: reuse for on-link mappings)
- `discord_id text` — nullable if user hadn't linked
- `role_id text` — nullable if skipped before role lookup
- `source text` — `'tournament_register'` initially; extensible
- `status text` — `'success' | 'skipped' | 'failed' | 'retry_pending'`
- `reason text` — e.g. `no_discord_role_configured`, `user_not_linked`, `bot_not_configured`, `discord_error`
- `http_status int`
- `error_message text` (≤500 chars)
- `attempt int` default 1
- `next_retry_at timestamptz` — nullable

Access rules (plain English):
- Only platform admins can view rows.
- Only backend services can write.

Index: `(created_at DESC)`, partial index `(next_retry_at) WHERE status = 'retry_pending'`.

### 2. Rewrite `supabase/functions/assign-tournament-role/index.ts`
- Always insert one row into `discord_role_action_log` before returning (including skip branches — currently they return silently).
- On Discord response:
  - **2xx** → `status='success'`, return `{ok:true, log_id}`.
  - **429** → read `Retry-After`, insert `status='retry_pending'`, `next_retry_at = now() + retry_after`, return 202.
  - **5xx** → `status='retry_pending'`, exponential backoff (`30s * 2^(attempt-1)`, cap 30 min, max 5 attempts), return 202.
  - **4xx (403 Missing Permissions, 404 Unknown Role/Member, etc.)** → `status='failed'`, no retry (config error), return 502 with `log_id`.
- Capture Discord response body (truncated 500 chars) into `error_message` so admins see "Missing Permissions" / "Missing Access" verbatim.
- Preserve existing JWT + admin/moderator authorization.

### 3. New edge function `process-discord-role-retry-queue`
- Cron-invoked (pg_cron, every 1 min) via `net.http_post`.
- Selects up to 25 rows where `status='retry_pending' AND next_retry_at <= now()`.
- For each: re-runs the Discord PUT, updates the row in place (increments `attempt`, updates `status`/`http_status`/`error_message`/`next_retry_at`).
- After `attempt >= 5` on failure: sets `status='failed'` and stops.
- `verify_jwt = false` + shared-secret header check (`DISCORD_ROLE_RETRY_SECRET`, generated via `generate_secret`).

### 4. Client toast (`src/hooks/useTournaments.ts`)
In `registerMutation`, replace the swallowed `console.warn` with:
- If invoke returns `error` or response body has `status !== 'success'`, fire `toast.warning("Registered — Discord role couldn't be assigned yet. An admin has been notified.")`.
- Do NOT block/reverse the registration.

### 5. Admin UI: "Discord Role Assignments" panel
New component `src/components/admin/DiscordRoleActionLog.tsx`, mounted inside `AdminEcosystem` under the existing Discord section.
- Table: last 100 rows, columns Time / Player (join `profiles.display_name`) / Tournament / Status pill / HTTP / Error / Attempt.
- Filter chips: All / Failed / Retry pending / Skipped / Success.
- Per-row **Retry** button on `failed` rows → sets `status='retry_pending', next_retry_at=now(), attempt=1` (via a small SECURITY DEFINER RPC `admin_retry_discord_role_action(log_id uuid)` gated to admins).
- Header count badge: "N failed in last 24h".

### 6. Health-check helper (small addition, same panel)
Button "Check bot permissions" → invokes `discord-server-roles` and additionally calls `GET /guilds/{id}/members/@me` inside that function; renders bot's highest role position vs. each tournament role that's currently referenced by an open tournament, flagging any where the bot sits below. Diagnoses the recurring 403 root cause without leaving the admin panel.

## Files touched

**New**
- `supabase/migrations/<ts>_discord_role_action_log.sql` — table, grants, RLS, admin SELECT policy, service_role write, `admin_retry_discord_role_action()` RPC, cron entry for retry processor.
- `supabase/functions/process-discord-role-retry-queue/index.ts`
- `src/components/admin/DiscordRoleActionLog.tsx`
- `src/hooks/useDiscordRoleActionLog.ts` — react-query list + retry mutation.

**Modified**
- `supabase/functions/assign-tournament-role/index.ts` — logging + retry classification.
- `supabase/functions/discord-server-roles/index.ts` — add bot member self-info in response.
- `src/hooks/useTournaments.ts` — surface failure toast.
- `src/pages/admin/AdminEcosystem.tsx` — mount the new panel.

## Out of scope (explicitly)
- Not touching `discord-oauth-callback` role assignment (`on_link` path). Same class of bug; can be a follow-up plan that reuses this table with `source='on_link'`.
- No changes to `discord_send_log`, webhook manager, or slash-command paths.
- Not modifying the security findings currently on-screen (`tenant_integrations_api_key_exposure`, `tenant_zip_codes_cross_tenant_read`) — separate scope.

## Risk / rollback
- Additive only. If the retry cron misbehaves, unschedule the cron entry; the base function still assigns roles synchronously. Log table can be truncated without affecting registrations.
