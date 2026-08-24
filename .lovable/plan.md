# Per-ISP Discord Channel Moderation — Sizing (read-only estimate)

Goal: a Play `tenant_admins` user (admin, optionally manager) can moderate exactly one channel on the shared FGN Discord guild `989943710013870140`, via channel permission overwrites — never guild Administrator, never a guild-wide role.

## What the code actually does today (confirmed)

- Discord edge functions in repo: `discord-oauth-callback`, `discord-send-message`, `discord-server-roles`, `discord-interactions`, `discord-register-commands`, `send-discord-backlog-reminder`. None of them create channels, create roles, or write `permission_overwrites`.
- The only role write is a `PUT /guilds/{guild}/members/{discordId}/roles/{roleId}` inside `discord-oauth-callback` (on_link trigger, mapped from platform `user_roles`), wrapped in a try/catch whose failure is logged and swallowed.
- `discord-server-roles` is read-only (`GET /guilds/{id}/roles`), admin-gated.
- `discord_channel_routes` is platform-admin bot posting against hand-pasted channel IDs; no tenant linkage beyond an optional `tenant_id` column.
- No `discord_channel_id` / `discord_role_id` on `tenants`; no Discord card in Tenant Integrations.

So this is greenfield: there is no provisioner to extend, only an OAuth callback and a poster to hook into.

## Recommended smallest slice

**Slice 1 + 2 + 3a (link-only assignment), manual backfill, no tenant UI.** That is the minimum that produces the outcome "ISP admin can moderate their own channel and no one else's":

1. Store `discord_role_id` / `discord_channel_id` per tenant.
2. A platform-admin-triggered provisioner that creates (or adopts) one role + one private channel with a channel-scoped overwrite granting Manage Channel/Manage Messages to that role.
3. Grant/revoke that role when a tenant admin links Discord and when `tenant_admins` rows change.

Everything else (guilds.join, bulk backfill of ~75, tenant-facing UI, #fgn-play-feed) is deferrable without weakening the isolation guarantee.

## LoE per slice

| # | Slice | LoE | Notes / risk |
|---|---|---|---|
| 1 | Schema: `tenants.discord_role_id`, `discord_channel_id`, optional `discord_category_id`, plus provisioning status + last-error columns | 2–4 h | Low risk. Snowflakes as `text`, nullable, admin-only write policy. |
| 2 | Provisioner edge function: create role, create private channel, set overwrites, persist snowflakes, verify bot role position | 2–3 days | Highest risk slice. Needs idempotency (adopt-if-exists by name), 429 handling, and a position check so the bot's own role sits above ISP roles and below FGN staff. Discord will not let the bot grant a permission it does not itself hold on that channel. |
| 3a | Assign/revoke on Discord link (extend `discord-oauth-callback`) | 4–6 h | Must stop swallowing failures for this path; surface a repair state instead. |
| 3b | Assign/revoke on `tenant_admins` insert/delete | 1–1.5 days | No hook exists today. Needs a DB trigger → queue/edge call, plus revoke-on-delete and a reconciler for missed events. |
| 4 | Guild membership gap | see below | Decision, not just code. |
| 5 | Backfill ~75 existing channels/roles (adopt rather than create) | 1.5–2 days | Mostly data work: name-match audit, dry-run report, then persist. Live channels `#hctc` / `#forked-deer` prove the naming is inconsistent enough to need a human-reviewed mapping table. |
| 6 | Tenant UI: read-only "your channel" panel | 4–6 h | Trivial once schema exists. |
| 6b | Platform-admin repair UI (re-provision, re-sync members, show last error) | 1–1.5 days | Recommended before backfill; it is how you fix the inevitable drift. |
| 7 | Safety tests: A-cannot-see-B, no guild Administrator, no guild-wide Manage Channels | 1 day | Includes an assertion in the provisioner that the created role's guild-level permission bitfield is exactly 0. |

Smallest slice total: roughly **4–5 working days**. Full set including backfill and repair UI: **9–12 working days**.

## Guild membership gap (slice 4)

Three options, ordered by cost:

- **"Must already be in FGN Discord"** — 0 extra dev beyond a clear error state in the link flow (~2 h for copy + surfacing). Recommended for Phase 2. Role PUT on a non-member currently fails silently; that becomes a visible "join the server first" state.
- **Controlled invite** — bot creates a per-tenant, limited-use invite to the ISP channel and stores it. ~0.5 day. Requires Create Instant Invite. Invites leak; needs max-age/max-uses.
- **`guilds.join`** — ~1–1.5 days. Requires adding the `guilds.join` OAuth scope (LinkDiscord is `identify` only today), storing the user access token, and Create Instant Invite on the bot. Highest consent and token-handling burden. Not worth it for a handful of ISP admins.

## Discord bot permission list (names only)

Guild-level, on the bot's own role:
- Manage Roles
- Manage Channels
- View Channels
- Send Messages
- Embed Links
- Manage Messages (only if ISP admins get message moderation)
- Create Instant Invite (only if the invite option in slice 4 is chosen)

Explicitly **not** requested: Administrator, Kick Members, Ban Members, Manage Guild.

Channel overwrite granted to the per-ISP role: View Channel, Send Messages, Manage Channel, and optionally Manage Messages — scoped to that one channel only.

Hard constraint: the bot cannot grant Manage Channel on a channel where it does not itself hold Manage Channel, and cannot manage a role positioned above its own. Both must be asserted at provision time, not assumed.

## Role-cap risk

215 of 250 guild roles are in use. One new role per ISP means the cap is hit at ~35 more tenants, well short of the ~75 existing ISP channels. Consequences:

- If the ~75 existing ISP roles already exist and are adopted (slice 5, adopt-not-create), the cap is not breached by this work — this is a further argument for backfill-by-adoption over create-new.
- Any net-new provisioning must pre-check role count and fail loudly with a "guild role budget exhausted" state rather than erroring mid-provision and leaving a channel without a role.
- Longer term the only real escapes are role reuse via member-level channel overwrites (overwrite the *user*, not a role — avoids new roles entirely, at the cost of per-member overwrite churn) or splitting guilds, which is out of scope. **Member-level overwrites are worth a serious look as the Phase 2 default**: they remove the role cap from the critical path and shrink slice 2 considerably.

## What stays manual

- Category placement and channel naming conventions for the ~75 existing channels (human-reviewed mapping).
- Bot role position in the guild hierarchy — set once, by hand, above ISP roles and below FGN staff.
- Any Developer Portal / app-matching, Community enablement, public invite creation — explicitly out of scope.
- Removing a departed ISP admin from the guild entirely (revoke only removes the channel grant).
- `#fgn-play-feed` — it does not fall out of this provisioner; it is a `discord_channel_routes` row and stays manual.

## Open decision for Darcy

Role-per-ISP versus member-level channel overwrites. The second avoids the 250-role cap entirely and is cheaper to build, but makes "who can moderate this channel" a per-user list rather than a role, which is slightly harder to audit in the Discord UI. Recommendation: member-level overwrites for Phase 2, keeping the schema columns so a role-based path stays open.
