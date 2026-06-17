# Discord Integration Assessment & Gap Report

## 1. What's Built Today

The platform's Discord integration is **identity- and role-centric only**. It uses the Discord REST API directly with a bot token — no webhooks, no channel messaging, no bidirectional sync.

### Identity / Linking
- `discord-oauth-callback` edge function — OAuth2 `identify` scope only. Writes `discord_id`, `discord_username`, `discord_avatar`, `discord_linked_at` to `profiles`.
- `LinkDiscord.tsx` page + `useDiscordClientId` hook (client ID stored in `app_settings`).
- `discord_bypass_requests` table + `AdminDiscordBypass` page for users who can't link (manual admin approval).
- `discord_role_mappings` table — maps platform triggers (`on_link`, `on_achievement`, `on_rank`, `on_tournament_win`, `manual`) to Discord guild roles.

### Server Role Management
- `discord-server-roles` edge function — admin-only, lists guild roles via `GET /guilds/{id}/roles`.
- `assign-tournament-role` edge function — assigns a configured `tournaments.discord_role_id` to a registered user via `PUT /guilds/{id}/members/{user}/roles/{role}`.
- `DiscordRoleManager` admin UI for mapping rules.

### Secrets in Use
- `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `discord_client_id` (app_settings), Discord OAuth client secret (env).

### Scope of OAuth Token
- `scope=identify` only. **No `guilds`, `guilds.members.read`, `messages.read`, `webhook.incoming`, `bot`, or `applications.commands`.**

## 2. What's Missing — Gap Analysis for "Sharing Info to the FGN Discord Channel"

There is currently **zero outbound channel communication**. Every Discord-facing feature mutates a member or reads roles; nothing posts content to a channel.

### Gap A — No channel-posting capability
- No usage of `POST /channels/{id}/messages`.
- No Discord webhook URL stored anywhere (no `DISCORD_WEBHOOK_*` secret, no `webhooks` table).
- No embed builder, no attachment uploader, no rate-limit handler.

### Gap B — No event → Discord publishing pipeline
Platform events that *should* trigger Discord posts but currently don't:
- Tournament created / bracket published / round advanced / winner crowned
- Tenant event published (`tenant_events`)
- Featured event / challenge / quest launched
- Prize redemption claimed
- Leaderboard weekly/seasonal recap
- New achievement earned (community-visible only)
- Forum `community_posts` with `category = 'Announcement'`
- Marketing scheduled posts (`scheduled_posts` only targets social, not Discord)

### Gap C — No channel routing or per-tenant channel config
- No table mapping `tenant_id` / event-type → Discord channel ID or webhook URL.
- Single-guild assumption baked in (`DISCORD_GUILD_ID` is a single env var); multi-tenant tenants on their own Discord servers are not supported.

### Gap D — No interactive / inbound Discord features
- No slash commands (`/leaderboard`, `/register`, `/challenge`).
- No interactions endpoint (would need `applications.commands` scope + signature verification).
- No gateway listener / bot worker (Deno edge functions are stateless — would require Cloudflare Worker, external service, or polling).
- No DM delivery for notifications (would need `bot` scope and `users/@me/channels`).

### Gap E — Gateway / connector coverage
- Lovable's connector gateway does **not** list Discord as a supported gateway connector. Any integration must use direct REST calls with the existing bot token or webhook URLs.
- No retry / dead-letter queue around Discord calls (`assign-tournament-role` is fire-and-forget).

### Gap F — Observability
- No `discord_send_log` table equivalent to `email_send_log`.
- Failures only surface in edge function logs; no admin dashboard for delivery status.

### Gap G — Content formatting
- No shared embed/template layer. Each new posting feature would re-implement formatting, color, thumbnail, footer.
- Brand-mode (`arcade` vs `enterprise`) is not represented in any Discord template.

## 3. Recommended Path Forward (phased, not yet building)

**Phase 1 — Minimum viable channel posting (webhook-based)**
- Add `discord_channel_webhooks` table: `id, tenant_id (nullable), purpose, webhook_url (secret), is_active`.
- New `discord-send-message` edge function: accepts `{ purpose, payload }`, looks up webhook, POSTs embed, logs to `discord_send_log`.
- Wire 2-3 highest-value triggers first: tournament published, tournament winner, tenant event published.

**Phase 2 — Bot-based posting & routing**
- Extend bot to use `POST /channels/{id}/messages` (already has `DISCORD_BOT_TOKEN`).
- Per-tenant channel mapping (replace single `DISCORD_GUILD_ID` with `tenant_discord_config` table).
- Shared embed builder in `supabase/functions/_shared/discordEmbeds.ts`.

**Phase 3 — Inbound & richer integration**
- Slash commands via interactions endpoint (requires public URL + signature verify).
- Scheduled-posts pipeline extended to Discord (parallel to existing social publishing).
- Admin UI: send-log viewer, retry button, channel test-message.

**Phase 4 — Multi-guild / tenant self-service**
- Per-tenant bot install flow (OAuth2 with `bot` + `applications.commands` scopes).
- Tenant admins map their own channels.

## 4. Technical Notes (for engineering)
- Webhook approach needs **no new OAuth scope** and no bot install per server — the user pastes a webhook URL from their Discord channel settings. Fastest unblock.
- Bot-token approach requires the FGN bot to be a member of the target guild with `Send Messages` + `Embed Links` permissions on the target channel.
- Discord global rate limit: 50 req/s per bot token; per-route buckets apply. A queue (pgmq, same pattern as `email_send_log`) is recommended once volume grows.
- Embeds: max 6000 chars total, 10 embeds per message, 25 fields per embed.
- For multi-tenant, store webhook URLs encrypted (Vault or `tenant_integrations.api_key_encrypted` pattern already in use).

## 5. Out of Scope for This Report
- Actual implementation of any phase.
- Pricing / Discord Developer Portal application changes.
- Migration of existing `discord_role_mappings` (those keep working unchanged).
