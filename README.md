# Fibre Gaming Network (FGN) — play.fgn.gg

A competitive gaming platform connecting ISP-sponsored communities with tournaments, challenges, quests, ranked ladders, cloud gaming, and achievement systems. Built for multi-tenant broadband providers who want to offer branded esports experiences to their subscribers.

**Production URL**: [https://play.fgn.gg](https://play.fgn.gg)

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Authentication & Registration Flow](#authentication--registration-flow)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Route Map](#route-map)
- [Key Features](#key-features)
- [Multi-Tenant (ISP) System](#multi-tenant-isp-system)
- [Edge Functions](#edge-functions)
- [Database Architecture](#database-architecture)
- [Storage Buckets](#storage-buckets)
- [Notification System](#notification-system)
- [Environment Variables & Secrets](#environment-variables--secrets)
- [Ecosystem Integration](#ecosystem-integration)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Legal Pages](#legal-pages)
- [Contributing](#contributing)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui + custom design tokens |
| **State** | TanStack React Query (server state), React Context (auth, coach) |
| **Backend** | Lovable Cloud (Supabase) — Auth, PostgreSQL, Edge Functions, Storage, Realtime |
| **Routing** | React Router v6 (SPA with nested layouts) |
| **Animations** | tsparticles (hero backgrounds), framer-motion |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Payments** | Stripe (tenant subscriptions, cloud gaming seats) |

---

## Architecture Overview

```
src/
├── components/           # Reusable UI components
│   ├── admin/            # Admin panel layouts, route guards (AdminRoute, MarketingRoute)
│   ├── moderator/        # Moderator panel layouts & route guard (ModeratorRoute)
│   ├── tenant/           # ISP tenant portal layouts & route guard (TenantRoute)
│   ├── tournaments/      # Tournament cards, brackets, prize display, create/edit dialogs
│   ├── challenges/       # Challenge cards, evidence upload, task checklists
│   ├── quests/           # Quest cards, chain cards, story narratives, rank badges
│   ├── coach/            # AI coach chat history panel, profile card
│   ├── auth/             # Registration sub-steps (ZIP check, subscriber verify)
│   ├── compare/          # Player comparison charts and tables
│   ├── games/            # Game cards, add game dialog
│   ├── marketing/        # Social accounts, scheduled posts, event promo editor
│   ├── media/            # Media library grid, uploader, AI image generator, editor
│   ├── player/           # Player profile header, stats grid, achievements, match history
│   ├── shared/           # Achievement badge display, points wallet card
│   ├── stats/            # Game stats, player stats report, skill insights
│   ├── webpages/         # Web page editor, section editor/preview
│   ├── ui/               # shadcn/ui primitives (button, dialog, table, etc.)
│   └── ...               # Navbar, Sidebar, ErrorBoundary, CookieConsent, etc.
├── contexts/
│   ├── AuthContext.tsx    # Session, roles (isAdmin/isModerator/isMarketing), Discord, billing status
│   └── CoachContext.tsx   # AI coach conversation state
├── hooks/                # 80+ custom hooks for data fetching & mutations
│   ├── useTournaments.ts         # Tournament CRUD & registration
│   ├── useChallengeDetail.ts     # Challenge enrollment & evidence management
│   ├── useQuestDetail.ts         # Quest enrollment & evidence management
│   ├── useQuestChains.ts         # Quest chain navigation & progress
│   ├── useLeaderboard.ts         # Seasonal leaderboard queries
│   ├── useTenantAdmin.ts         # Tenant role detection & info
│   ├── useCoachChat.ts           # AI coach message send/receive
│   ├── useMediaLibrary.ts        # Media upload, tagging, deletion
│   ├── useGameServers.ts         # Game server CRUD & status polling
│   ├── useCloudGamingSeats.ts    # Cloud gaming seat management
│   ├── useTenantBilling.ts       # Stripe subscription management
│   └── ...
├── pages/                # Route-level page components
│   ├── admin/            # 18 admin dashboard pages
│   ├── guides/           # Player-facing guide pages (Challenge, Quest, Tournament)
│   ├── moderator/        # 9 moderator management pages
│   └── tenant/           # 14 ISP tenant portal pages
├── integrations/
│   └── supabase/
│       ├── client.ts     # Auto-generated Supabase client (DO NOT EDIT)
│       └── types.ts      # Auto-generated TypeScript types from DB schema (DO NOT EDIT)
├── lib/                  # Utility functions (export, image resize, notifications, Stripe products)
└── assets/               # Static images (game covers, hero backgrounds, logos)

supabase/
├── config.toml           # Edge function configuration (DO NOT EDIT)
├── functions/            # 50 Deno edge functions
│   ├── _shared/          # Shared email templates (signup, recovery, invite, etc.)
│   ├── ai-coach/         # AI-powered game coaching
│   ├── sync-to-academy/  # FGN Academy challenge completion sync
│   ├── create-checkout/  # Stripe billing checkout
│   ├── game-server-status/ # Pterodactyl panel status polling
│   └── ...
└── migrations/           # Auto-generated SQL migrations (DO NOT EDIT)
```

---

## Authentication & Registration Flow

The registration process is a multi-step gated funnel:

```
1. ZIP Code Check ──→ Validates service area via SmartyStreets API
                      └─ If no ISP serves the ZIP → Access Request form (stored in `access_requests`)
                      └─ If bypass code provided → Skip to signup

2. Subscriber Verify ──→ Matches user against ISP subscriber database (`tenant_subscribers`)
                         └─ Calls `validate-subscriber` edge function

3. Email Signup ──→ Standard email/password registration via Supabase Auth
                    └─ Triggers `handle_new_user()` → creates `profiles` row
                    └─ Email verification required (auto-confirm is OFF)

4. Discord OAuth ──→ Mandatory Discord account linking before app access
                     └─ `discord-oauth-callback` edge function handles OAuth flow
                     └─ Assigns verified role via Discord bot (`DISCORD_BOT_TOKEN`)

5. Dashboard ──→ Full app access granted
```

**Login**: Email/password → Supabase Auth session → roles fetched from `user_roles` → Discord status checked from `profiles.discord_id`

---

## Role-Based Access Control (RBAC)

### Platform Roles

Stored in `user_roles` table using `app_role` enum. A user can hold **multiple** roles simultaneously.

| Role | Enum Value | Access Scope |
|------|-----------|--------------|
| **Admin** | `admin` | Full platform: users, games, seasons, settings, tenants, media, bypass codes, legacy users, ecosystem, cloud gaming |
| **Moderator** | `moderator` | Tournament management, match scoring, point adjustments, challenges, quests, ladders, prize redemptions, achievements |
| **Marketing** | `marketing` | Campaign creation, branded calendar publishing, marketing assets, social publishing |
| **Player** | _(default)_ | Tournaments, challenges, quests, community, prize shop, leaderboard, achievements, game servers |

### Tenant Roles

Stored in `tenant_admins` table with a text `role` field (not the `app_role` enum).

| Role | Access |
|------|--------|
| **Tenant Admin** (`admin`) | Full ISP portal: events, subscribers, billing config, team management, ZIP codes, cloud gaming, web pages |
| **Tenant Marketing** (`marketing`) | Marketing assets, branded calendars, web pages for their tenant |

### Server-Side Enforcement

All RLS policies use `SECURITY DEFINER` helper functions to prevent recursive policy evaluation:

```sql
has_role(user_id, role)                    -- Platform role check
is_tenant_member(tenant_id, user_id)       -- Any tenant role
is_tenant_admin(tenant_id, user_id)        -- Tenant admin only
is_tenant_marketing_member(tenant_id, user_id) -- Tenant admin or marketing
```

### Client-Side Route Guards

| Component | File | Access Rule |
|-----------|------|-------------|
| `AdminRoute` | `src/components/admin/AdminRoute.tsx` | `isAdmin` only |
| `ModeratorRoute` | `src/components/moderator/ModeratorRoute.tsx` | `isAdmin \|\| isModerator` |
| `MarketingRoute` | `src/components/admin/MarketingRoute.tsx` | `isAdmin \|\| isMarketing` |
| `TenantRoute` | `src/components/tenant/TenantRoute.tsx` | `tenant_admins` membership |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Any authenticated user + Discord linked |

---

## Route Map

### Public Routes (no auth required)

| Path | Page | Description |
|------|------|-------------|
| `/` | `Index` | Landing page with hero, featured tournaments |
| `/auth` | `Auth` | Login / multi-step registration |
| `/terms` | `Terms` | Terms of Service |
| `/privacy` | `PrivacyPolicy` | Privacy Policy |
| `/acceptable-use` | `AcceptableUsePolicy` | Acceptable Use Policy |
| `/disabled-users` | `DisabledUsersNotice` | Disabled Users Notice |
| `/reset-password` | `ResetPassword` | Password reset flow |
| `/confirm-email` | `ConfirmEmail` | Email confirmation landing |
| `/for-providers` | `ForProviders` | Self-service tenant signup |
| `/white-paper` | `WhitePaper` | Platform white paper |
| `/events/:tenantSlug` | `TenantEventPage` | Public tenant event listing |
| `/events/:tenantSlug/:eventId` | `TenantEventDetail` | Public event detail |
| `/embed/calendar/:configId` | `EmbedCalendar` | Embeddable tournament calendar (iframe) |
| `/pages/:tenantSlug/:pageSlug` | `WebPageView` | Tenant-published web pages |

### Authenticated Player Routes

| Path | Page | Description |
|------|------|-------------|
| `/dashboard` | `Dashboard` | Player home with stats overview |
| `/tournaments` | `Tournaments` | Browse & register for tournaments |
| `/tournaments/:id` | `TournamentDetail` | Tournament info, registration, schedule |
| `/tournaments/:id/bracket` | `TournamentBracket` | Interactive bracket visualization |
| `/tournaments/:id/manage` | `TournamentManage` | Tournament management (if authorized) |
| `/calendar` | `TournamentCalendar` | Calendar view of upcoming tournaments |
| `/community` | `Community` | Forum: posts, replies, likes, pinning |
| `/leaderboard` | `Leaderboard` | Seasonal ranked leaderboard |
| `/season-stats` | `SeasonStats` | Detailed season statistics |
| `/compare` | `PlayerComparison` | Head-to-head player comparison |
| `/achievements` | `Achievements` | Achievement gallery with progress |
| `/games` | `Games` | Game catalog with categories |
| `/games/:slug` | `GameDetail` | Game detail with guides |
| `/player/:id` | `PlayerProfile` | Player profile: stats, achievements, match history |
| `/challenges` | `Challenges` | Browse & enroll in challenges |
| `/challenges/:id` | `ChallengeDetail` | Challenge detail, task checklist, evidence upload |
| `/quests` | `Quests` | Browse quests with chain navigation |
| `/quests/:id` | `QuestDetail` | Quest detail, story narrative, evidence upload |
| `/prize-shop` | `PrizeShop` | Redeem points for prizes |
| `/ladders` | `Ladders` | Ranked ladder standings |
| `/game-servers` | `GameServers` | Game server directory |
| `/servers` | `GameServers` | Game server directory (alias) |
| `/media-library` | `MediaLibrary` | Media library browser |
| `/guide` | `PlayerGuide` | Searchable player guide |
| `/guide/tournaments` | `TournamentGuide` | Tournament-specific guide |
| `/guide/challenges` | `ChallengeGuide` | Challenge-specific guide |
| `/guide/quests` | `QuestGuide` | Quest-specific guide |
| `/profile` | `ProfileSettings` | Edit profile, avatar, gamer tag |
| `/link-discord` | `LinkDiscord` | Discord OAuth linking (pre-dashboard gate) |

### Admin Routes (`/admin/*`)

18 pages covering: Dashboard, Users, Games, Tournaments, Seasons, Achievements, Media Library, Settings, Bypass Codes, Tenants, Notebooks, Marketing, Access Requests, Legacy Users, Challenges, Cloud Gaming, Ecosystem, Discord Bypass, Game Servers, Web Pages, Admin Guide.

### Moderator Routes (`/moderator/*`)

9 pages covering: Dashboard, Tournaments, Matches, Points, Challenges, Ladders, Redemptions, Achievements, Moderator Guide.

### Tenant Routes (`/tenant/*`)

14 pages covering: Dashboard, Players, Leads, ZIP Codes, Subscribers, Team, Settings, Marketing, Marketing Assets, Marketing Detail, Events, Codes, Web Pages, Tenant Guide.

---

## Key Features

### Tournament System
- Full CRUD with game selection, format, dates, prize pools
- Bracket generation and round-by-round match scoring
- Player registration with capacity enforcement
- Email + in-app notifications at every lifecycle stage
- Calendar view with embeddable widget for tenant co-branding
- Promotional email blasts via `tournament-promo-email`

### Challenge System (Work Orders)
- Created by moderators with optional task checklists
- Players enroll, complete tasks, upload evidence (images/videos)
- Per-evidence moderator review with approve/reject + feedback notes
- AI-enhanced challenge descriptions via `enhance-challenge-description` edge function
- `certification_description` field for external system integration
- Automatic sync to FGN Academy on completion (see [Ecosystem Integration](#ecosystem-integration))

### Quest System
- Story-driven challenges with narrative intro/outro
- Sequential quest chains where completing one unlocks the next
- Per-task incremental point rewards (not lump sum at completion)
- XP-based rank tiers: Novice → Apprentice → Journeyman → Expert → Master → Grandmaster → Legend
- AI-enhanced story narratives via `enhance-quest-narrative` edge function
- Linked achievements displayed via `AchievementBadgeDisplay` component

### Ranked Ladders
- ELO-based rating system
- Moderator-managed match results
- Per-game ladder standings

### Seasonal Leaderboard
- Point accumulation across tournaments, challenges, and quests
- Season rotation with `rotate-season` edge function
- Historical snapshots in `season_snapshots` table
- Point adjustments by moderators (bonus/penalty)
- Spendable points wallet (`points_available`) for prize redemptions

### Achievement System
- Admin-defined achievements with tiers (bronze/silver/gold/platinum)
- Auto-criteria evaluation + manual award by admins
- Progress tracking with notifications on unlock
- Linkable to challenges and quests

### Prize Shop
- Point-based redemptions with stock management
- Moderator review workflow (pending → approved → fulfilled / denied)
- Automatic point deduction on approval via DB trigger
- Stock decrement via DB trigger

### AI Coach
- Game-specific coaching via floating chat panel
- RAG architecture with Open Notebook + game guide context
- Conversation history persisted across devices
- Powered by Lovable AI (no external API key required)

### Game Server Directory
- Admin-managed server listings with IP, port, game linking
- Live status polling via Pterodactyl Panel integration
- Player-facing card grid with one-click IP copy and connection instructions
- AI-enhanced server descriptions

### Cloud Gaming
- Tenant-managed cloud gaming seat allocation (Blacknut integration)
- Stripe per-seat billing ($29.99/mo)
- Subscriber seat activation/deactivation tracking

### Stripe Billing
- Tenant subscription management ($850/mo Tenant Basic)
- Self-service signup flow at `/for-providers`
- Stripe Customer Portal for subscription management
- Webhook-driven status sync

### Social Publishing
- Connect social media accounts
- Schedule posts with calendar-based UI
- Cron-triggered auto-publishing

### Community Forum
- Threaded posts with replies, likes, pinning
- Category-based organization
- Admin/moderator moderation controls

### Media Library
- Upload images/videos to `app-media` storage bucket
- AI image generation via `generate-media-image` edge function
- Tagging, categories, inline editor with canvas tools
- Template gallery panel

### Player Profiles
- Avatar upload, gamer tag, display name
- Match history, achievement showcase
- Head-to-head comparison with other players
- Skill insights and game-specific stats
- Rank progression charts

---

## Multi-Tenant (ISP) System

Each broadband provider (tenant) has:

| Table | Purpose |
|-------|---------|
| `tenants` | Org record: name, slug, logo, billing config, status |
| `tenant_admins` | User-role assignments scoped to tenant |
| `tenant_subscribers` | Synced subscriber list (NISC/GLDS/CSV) |
| `tenant_events` | Local tournaments and events |
| `tenant_event_assets` | Event promotional materials |
| `tenant_event_registrations` | Event registration tracking |
| `tenant_integrations` | Billing system API connections (NISC, GLDS, FGN Academy) |
| `tenant_zip_codes` | Service area ZIP codes |
| `tenant_marketing_assets` | Co-branded marketing materials |
| `tenant_cloud_gaming` | Cloud gaming configuration (seats, tier) |
| `tenant_campaign_codes` | Campaign/promo codes |
| `tenant_subscriptions` | Stripe subscription records |
| `tenant_web_pages` / `tenant_web_page_sections` | CMS-style web pages |

### Subscriber Sync

Two billing system integrations:

1. **NISC**: `nisc-sync` edge function pulls from NISC API
2. **GLDS**: `glds-sync` edge function pulls from GLDS API

Both sync to `tenant_subscribers` with deduplication via `external_id`.

### Self-Service Signup

Broadband providers can self-register at `/for-providers`:
1. Fill out signup form → `provision-tenant` edge function creates org + admin role
2. Redirect to Stripe checkout → `stripe-webhook` activates tenant on payment

### Public Event Pages

Tenants get public event pages at `/events/:tenantSlug` and `/events/:tenantSlug/:eventId`, accessible without authentication.

### Tenant Web Pages

Tenants can create custom CMS-style web pages published at `/pages/:tenantSlug/:pageSlug`.

---

## Edge Functions

All edge functions are Deno-based, deployed automatically, and located in `supabase/functions/`. **50 functions total.**

### AI & Enhancement (5)

| Function | Purpose |
|----------|---------|
| `ai-coach` | AI game coaching with RAG context |
| `enhance-challenge-description` | AI-enhance challenge descriptions |
| `enhance-quest-narrative` | AI-enhance quest story narratives |
| `enhance-server-description` | AI-enhance game server descriptions |
| `generate-media-image` | AI image generation for media library |

### Authentication & Users (7)

| Function | Purpose |
|----------|---------|
| `auth-email-hook` | Custom branded email templates for auth events |
| `check-ban-status` | Check if a user is banned |
| `check-users-confirmed` | Verify email confirmation status |
| `delete-user` | Admin user deletion |
| `resend-confirmation` | Resend email confirmation |
| `validate-subscriber` | Verify user is active ISP subscriber |
| `validate-zip` | Validate ZIP code via SmartyStreets API |

### Discord & Steam (4)

| Function | Purpose |
|----------|---------|
| `discord-oauth-callback` | Handle Discord OAuth flow, link accounts, assign roles |
| `discord-server-roles` | Fetch Discord server roles |
| `assign-tournament-role` | Assign Discord role for tournament participants |
| `steam-openid-callback` | Handle Steam OpenID authentication |

### Tournament & Season (4)

| Function | Purpose |
|----------|---------|
| `award-season-points` | Award points for tournament placements |
| `rotate-season` | End current season, snapshot standings, start new |
| `tournament-reminders` | Send upcoming tournament reminder emails |
| `tournament-promo-email` | Send tournament promotional emails |

### Tenant & Billing (8)

| Function | Purpose |
|----------|---------|
| `provision-tenant` | Auto-provision new tenant organization |
| `validate-tenant-code` | Validate tenant campaign/promo codes |
| `create-checkout` | Create Stripe Checkout session |
| `customer-portal` | Generate Stripe Customer Portal URL |
| `check-subscription` | Verify active Stripe subscription |
| `stripe-webhook` | Process Stripe webhook events |
| `send-tenant-invite` | Send tenant team invitation email |
| `send-invite-welcome` | Send welcome email to invited tenant members |

### Subscriber Sync (2)

| Function | Purpose |
|----------|---------|
| `nisc-sync` | Sync subscribers from NISC billing system |
| `glds-sync` | Sync subscribers from GLDS billing system |

### FGN Academy & Ecosystem (7)

| Function | Purpose |
|----------|---------|
| `sync-to-academy` | Sync challenge completions to FGN Academy Skill Passport |
| `monitor-academy-sync` | Hourly cron: alert admins if academy sync failures exceed threshold |
| `ecosystem-data-api` | REST API for ecosystem apps to pull platform data |
| `ecosystem-magic-link` | Generate cross-app SSO tokens |
| `validate-ecosystem-token` | Validate cross-app SSO tokens |
| `ecosystem-calendar-feed` | iCal/JSON feed of tournaments and events |
| `ecosystem-webhook-dispatch` | Dispatch webhook events to registered endpoints |

### Email & Notifications (4)

| Function | Purpose |
|----------|---------|
| `send-notification-email` | Send transactional emails via Resend |
| `send-tournament-email` | Send tournament-specific emails |
| `reengagement-email` | Send re-engagement emails to inactive users (cron) |
| `weekly-recap-email` | Send weekly activity recap emails (cron) |

### Social Publishing (2)

| Function | Purpose |
|----------|---------|
| `publish-scheduled-posts` | Check and publish due scheduled posts (cron) |
| `publish-to-social` | Deliver content to social media platforms |

### Game Servers (1)

| Function | Purpose |
|----------|---------|
| `game-server-status` | Poll Pterodactyl Panel for server status |

### Legacy & Migration (4)

| Function | Purpose |
|----------|---------|
| `import-legacy-users` | Bulk import legacy user records |
| `match-legacy-user` | Match current user to legacy account |
| `backfill-legacy-zips` | Backfill ZIP codes for legacy users |
| `backfill-zip-geo` | Backfill geo coordinates for ZIP codes |

### Knowledge Base (1)

| Function | Purpose |
|----------|---------|
| `notebook-proxy` | Proxy requests to Open Notebook instances |

### Monitoring (1)

| Function | Purpose |
|----------|---------|
| `monitor-academy-sync` | Hourly check for academy sync failures (cron) |

### Shared Email Templates

Located in `supabase/functions/_shared/email-templates/`:
- `signup.tsx` — Welcome email
- `recovery.tsx` — Password reset
- `invite.tsx` — Team invitation
- `magic-link.tsx` — Magic link auth
- `email-change.tsx` — Email change confirmation
- `reauthentication.tsx` — Re-authentication prompt

---

## Database Architecture

### Key Tables (60+ tables total)

| Category | Tables |
|----------|--------|
| **Auth & Profiles** | `profiles`, `user_roles`, `access_requests`, `bypass_codes`, `banned_users`, `discord_bypass_requests` |
| **Tournaments** | `tournaments`, `tournament_registrations`, `match_results` |
| **Challenges** | `challenges`, `challenge_tasks`, `challenge_enrollments`, `challenge_evidence`, `challenge_completions` |
| **Quests** | `quests`, `quest_tasks`, `quest_enrollments`, `quest_evidence`, `quest_completions`, `quest_chains`, `quest_chain_quests`, `quest_task_point_awards` |
| **Seasons** | `seasons`, `season_scores`, `season_snapshots`, `point_adjustments` |
| **Achievements** | `achievement_definitions`, `player_achievements` |
| **Prizes** | `prizes`, `prize_redemptions` |
| **Ladders** | `ladders`, `ladder_entries` |
| **Community** | `community_posts`, `community_likes` |
| **AI Coach** | `coach_conversations`, `coach_messages`, `coach_player_profiles`, `coach_player_files` |
| **Games & Servers** | `games`, `game_servers` |
| **Cloud Gaming** | `cloud_games`, `tenant_cloud_gaming`, `subscriber_cloud_access` |
| **Notifications** | `notifications`, `notification_preferences`, `engagement_email_log` |
| **Media** | `media_library`, `guide_media` |
| **Marketing** | `marketing_campaigns`, `marketing_assets`, `calendar_publish_configs` |
| **Social Publishing** | `social_accounts`, `scheduled_posts` |
| **Tenant** | `tenants`, `tenant_admins`, `tenant_subscribers`, `tenant_events`, `tenant_event_assets`, `tenant_event_registrations`, `tenant_integrations`, `tenant_sync_logs`, `tenant_zip_codes`, `tenant_marketing_assets`, `tenant_cloud_gaming`, `tenant_campaign_codes`, `tenant_subscriptions`, `tenant_web_pages`, `tenant_web_page_sections` |
| **Ecosystem** | `ecosystem_auth_tokens`, `ecosystem_sync_log`, `ecosystem_webhooks`, `career_path_mappings` |
| **Discord** | `discord_role_mappings` |
| **Admin** | `app_settings`, `managed_pages`, `page_backgrounds`, `page_hero_images`, `admin_notebook_connections`, `legacy_users`, `national_zip_codes`, `user_service_interests` |

### Conventions

- All tables use `uuid` primary keys with `gen_random_uuid()` defaults
- Timestamps use `timestamp with time zone` defaulting to `now()`
- Soft references to `auth.users` via `user_id uuid` (no FK to auth schema)
- RLS enabled on all tables
- `SECURITY DEFINER` functions for cross-table role checks
- Validation triggers preferred over CHECK constraints

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `has_role(user_id, role)` | Check platform role (SECURITY DEFINER) |
| `is_tenant_member(tenant_id, user_id)` | Check any tenant membership |
| `is_tenant_admin(tenant_id, user_id)` | Check tenant admin role |
| `is_tenant_marketing_member(tenant_id, user_id)` | Check tenant admin or marketing |
| `should_notify(user_id, type, channel)` | Check notification preferences |
| `handle_new_user()` | Create profile on signup (trigger) |
| `validate_bypass_code(code)` | Validate & consume bypass codes |
| `lookup_providers_by_zip(zip)` | Find ISPs serving a ZIP code |
| `deduct_points_on_approval()` | Deduct points when redemption approved (trigger) |
| `decrement_prize_stock()` | Decrease stock on redemption approval (trigger) |
| `notify_*()` | Various in-app notification triggers |
| `email_*()` | Various email notification triggers |

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile pictures |
| `app-media` | Yes | Challenge/quest evidence, media library uploads, marketing assets, event images, server images |
| `email-assets` | Yes | Static assets for email templates (logos, banners) |

---

## Notification System

### Channels

1. **In-App**: PostgreSQL triggers insert into `notifications` table. Client polls via React Query.
2. **Email**: Triggers call `send-notification-email` edge function which uses Resend API with custom HTML templates.

### Notification Types

| Type | In-App | Email | Triggered By |
|------|--------|-------|-------------|
| `registration_confirmed` | ✅ | ✅ | Tournament registration |
| `tournament_starting` | ✅ | ✅ | Tournament status → `in_progress` |
| `match_completed` | ✅ | ✅ | Match status → `completed` |
| `new_challenge` | ✅ | ✅ | Challenge created with `is_active = true` |
| `redemption_update` | ✅ | ✅ | Prize redemption status change |
| `achievement_earned` | ✅ | ✅ | Achievement awarded to player |
| `access_request_new` | ✅ | ✅ | New access request submitted |
| `points_awarded` | ✅ | — | Points added/deducted |
| `challenge_approved` | ✅ | ✅ | Challenge evidence approved |
| `quest_task_approved` | ✅ | — | Quest task evidence approved |
| `academy_sync_alert` | ✅ | ✅ | Academy sync failures exceed threshold |

### User Preferences

The `notification_preferences` table allows per-type opt-in/opt-out for both channels. The `should_notify()` database function checks before sending. Defaults to `true` if no preference row exists.

---

## Environment Variables & Secrets

### Auto-Managed (`.env` — DO NOT EDIT)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Edge Function Secrets (configured via Lovable Cloud)

| Secret | Used By | Purpose |
|--------|---------|---------|
| `RESEND_API_KEY` | `send-notification-email`, `send-tournament-email`, `reengagement-email`, `weekly-recap-email`, `tournament-promo-email`, `monitor-academy-sync` | Email delivery via Resend |
| `DISCORD_CLIENT_ID` | `discord-oauth-callback` | Discord OAuth app ID |
| `DISCORD_CLIENT_SECRET` | `discord-oauth-callback` | Discord OAuth app secret |
| `DISCORD_BOT_TOKEN` | `discord-oauth-callback`, `discord-server-roles`, `assign-tournament-role` | Discord bot for role assignment |
| `DISCORD_GUILD_ID` | `discord-oauth-callback`, `discord-server-roles` | Target Discord server |
| `DISCORD_VERIFIED_ROLE_ID` | `discord-oauth-callback` | Role to assign on verification |
| `SMARTY_AUTH_ID` | `validate-zip` | SmartyStreets API auth |
| `SMARTY_AUTH_TOKEN` | `validate-zip` | SmartyStreets API token |
| `LOVABLE_API_KEY` | `ai-coach`, `generate-media-image`, `enhance-challenge-description`, `enhance-quest-narrative`, `enhance-server-description` | Lovable AI features |
| `OPEN_NOTEBOOK_URL` | `notebook-proxy`, `ai-coach` | Open Notebook instance URL |
| `OPEN_NOTEBOOK_PASSWORD` | `notebook-proxy`, `ai-coach` | Open Notebook auth |
| `FGN_ACADEMY_API_KEY` | `sync-to-academy` | FGN Academy API authentication |
| `ECOSYSTEM_API_KEY` | `ecosystem-data-api` | Ecosystem pull API authentication |
| `STRIPE_SECRET_KEY` | `create-checkout`, `customer-portal`, `check-subscription`, `stripe-webhook` | Stripe billing API |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Stripe webhook signature verification |
| `PTERODACTYL_API_KEY` | `game-server-status` | Pterodactyl Panel API for server status |
| `SUPABASE_SERVICE_ROLE_KEY` | Multiple functions | Service role for admin operations |

---

## Ecosystem Integration

FGN operates as part of a multi-app ecosystem with hub-and-spoke architecture:

| App | Domain | Purpose |
|-----|--------|---------|
| **FGN Play** | `play.fgn.gg` | This app — gaming platform (source of truth) |
| **FGN Academy** | `fgn.academy` | LMS / Skill Passport |
| **FGN Manage** | `manage.fgn.gg` | ISP subscriber verification portal |
| **FGN Hub** | `hub.fgn.gg` | Partner hub for creative assets |

### Cross-App SSO

Magic link tokens generated by `ecosystem-magic-link` and validated by `validate-ecosystem-token`. Tokens stored in `ecosystem_auth_tokens` and expire after use.

### FGN Academy Integration

Challenge completions automatically sync to the academy's Skill Passport via `sync-to-academy` edge function. Includes score calculation, task-level progress, and skill tagging. Monitored by hourly `monitor-academy-sync` cron. See [docs/play-fgn-gg-integration-guide.md](docs/play-fgn-gg-integration-guide.md) for full specification.

### Ecosystem Data API

REST-style pull API (`ecosystem-data-api`) providing tournaments, challenges, quests, player progress, achievements, and season stats to external apps. Authenticated via `X-Ecosystem-Key` header.

### Calendar Feed

iCal/JSON feed (`ecosystem-calendar-feed`) for external calendar subscriptions.

### Webhook Dispatch

Push notifications to registered endpoints (`ecosystem-webhook-dispatch`) with HMAC-SHA256 signature verification.

### Career Path Mappings

The `career_path_mappings` table maps challenges and games to external career path modules for automated credential tracking.

---

## Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start dev server (connects to Lovable Cloud backend automatically)
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Key Files (DO NOT EDIT — auto-generated)

- `src/integrations/supabase/client.ts` — Supabase client instance
- `src/integrations/supabase/types.ts` — TypeScript types from DB schema
- `supabase/config.toml` — Edge function configuration
- `.env` — Environment variables
- `supabase/migrations/` — Database migration files

---

## Deployment

### Frontend
Deploys via Lovable's **Publish** button. Click "Update" in the publish dialog to push frontend changes to production.

### Backend
Edge functions and database migrations deploy **automatically** on commit — no manual action needed.

### DNS Configuration
- **Domain**: `play.fgn.gg`
- **A Record**: `play` → `185.158.133.1` (Lovable edge)
- **A Record**: `www.play` → `185.158.133.1` (redirect to primary)

---

## Legal Pages

| Path | Page |
|------|------|
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/acceptable-use` | Acceptable Use Policy |
| `/disabled-users` | Disabled Users Notice |

---

## Contributing

### Code Conventions

- **Pages**: PascalCase, one per route (`Dashboard.tsx`, `TournamentBracket.tsx`)
- **Hooks**: `use` prefix, camelCase (`useTournaments.ts`, `useQuestChains.ts`)
- **Components**: PascalCase, grouped by domain folder (`tournaments/`, `quests/`, `admin/`)
- **Edge Functions**: kebab-case directory names (`ai-coach/`, `sync-to-academy/`)

### Architecture Decisions

- All color values use HSL via CSS custom properties (design tokens in `index.css`)
- Server state managed exclusively via TanStack React Query with cache invalidation
- Auth state in React Context (`AuthContext`) — roles derived from array, not single value
- RLS policies use SECURITY DEFINER helper functions to avoid recursion
- No direct foreign keys to `auth.users` — soft reference via `user_id uuid`
- Flat JSON payloads for ecosystem sync (not nested)

### For Detailed Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for in-depth documentation of the multi-tenant system, tournament lifecycle, challenge workflow, quest system, billing integration, notification triggers, and database conventions.
