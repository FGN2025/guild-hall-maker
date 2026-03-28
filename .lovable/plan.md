

## Update Developer Documentation to Match Current Build

### Assessment Summary

The four **user-facing guides** (Player, Admin, Moderator, Tenant) are up to date and well-structured — they cover FGN Academy sync, quest chains, game servers, cloud gaming, and all recent features.

The **developer documentation** (ARCHITECTURE.md and README.md) is significantly behind. Both were last substantively updated around March 5, 2026, and are missing 30+ edge functions and several major subsystems.

### Gaps Identified

**ARCHITECTURE.md (last updated: 2026-03-05)**

| Gap | Detail |
|-----|--------|
| Edge Functions inventory lists ~17 | Actual count is **50** — missing 33 functions including `sync-to-academy`, `monitor-academy-sync`, `ecosystem-data-api`, `ecosystem-calendar-feed`, `ecosystem-webhook-dispatch`, `provision-tenant`, `create-checkout`, `customer-portal`, `stripe-webhook`, `check-subscription`, `check-ban-status`, `steam-openid-callback`, `publish-to-social`, `publish-scheduled-posts`, `game-server-status`, `enhance-quest-narrative`, `enhance-server-description`, `discord-server-roles`, `assign-tournament-role`, `send-tenant-invite`, `send-invite-welcome`, `validate-tenant-code`, `tournament-promo-email`, `reengagement-email`, `weekly-recap-email`, `resend-confirmation`, `check-users-confirmed`, `delete-user`, `backfill-legacy-zips`, `backfill-zip-geo` |
| No Quest system section | Quest chains, XP ranks, story narratives, enrollment — all missing |
| No Game Server section | Server directory, Pterodactyl panel integration, Shockbyte guide |
| No Cloud Gaming section | Seat management, Blacknut integration, Stripe per-seat billing |
| No Stripe/Billing section | Tenant subscriptions, checkout, webhooks, customer portal |
| No FGN Academy Integration section | Sync pipeline, payload contract, monitoring, data API |
| No Scheduled Social Publishing section | Social accounts, scheduled posts, cron job |
| No `certification_description` column | Recently added to challenges table |
| Ecosystem section incomplete | Missing calendar feed, data API, webhook dispatch, career path mappings |
| Database table count says "40+" | Likely 60+ now with quest tables, ecosystem tables, tenant subscriptions, cloud gaming, etc. |
| Missing notification types | Points awarded/deducted, challenge approved, quest notifications |

**README.md**

| Gap | Detail |
|-----|--------|
| Edge Functions table lists 17 | Same gap as ARCHITECTURE.md — needs 50 |
| Route Map incomplete | Missing `/quests`, `/quests/:id`, `/game-servers`, `/servers`, `/for-providers`, `/white-paper`, `/guide/tournaments`, `/guide/challenges`, `/guide/quests`, `/pages/:tenantSlug/:pageSlug` |
| Key Features missing | Quest system, game servers, cloud gaming, Stripe billing, social publishing, FGN Academy integration |
| Database table list incomplete | Missing quest, ecosystem, cloud gaming, tenant subscription tables |
| Secrets table incomplete | Missing `FGN_ACADEMY_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PTERODACTYL_API_KEY` |
| Tenant routes says "11 pages" | Now includes additional pages (Codes, Web Pages, Marketing Detail) |

### Plan

#### 1. Update ARCHITECTURE.md

- Update the "Last updated" date to 2026-03-28
- Add **Quest / Quest Chain System** section (tables, lifecycle, XP rank tiers, chain completion triggers)
- Add **Game Server Directory** section (tables, Pterodactyl panel integration, status polling)
- Add **Cloud Gaming** section (seat management, Stripe per-seat billing, Blacknut placeholder)
- Add **Stripe Billing** section (tenant subscriptions, checkout flow, webhook sync)
- Add **FGN Academy Integration** section (sync-to-academy pipeline, monitor-academy-sync cron, ecosystem-data-api, payload contract reference)
- Add **Scheduled Social Publishing** section (social accounts, scheduled posts, cron publishing)
- Expand **Ecosystem Integration** with calendar feed, data API, webhook dispatch, career path mappings
- Replace Edge Functions inventory table with complete 50-function list grouped by category
- Update Database Design section: add missing table groups (quests, ecosystem sync, cloud gaming, tenant subscriptions, web pages, social accounts)
- Update notification types table with new triggers (points_awarded, challenge_approved, quest notifications)
- Add `certification_description` to Challenge schema

#### 2. Update README.md

- Update Edge Functions table to match the full 50-function inventory
- Add missing routes to Route Map (quests, game servers, web pages, guides, for-providers, white-paper)
- Add Key Features sections: Quest System, Game Servers, Cloud Gaming, Stripe Billing, FGN Academy, Social Publishing
- Update Database Architecture table with missing table groups
- Update Secrets table with new keys
- Update Tenant route count and Admin route count

### Files Changed

| File | Change |
|------|--------|
| `ARCHITECTURE.md` | Major update — add 6 new sections, expand edge function inventory from 17→50, update database tables, notifications, ecosystem |
| `README.md` | Major update — sync edge functions, routes, features, database tables, and secrets with current build |

