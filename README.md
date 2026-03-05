# Fibre Gaming Network (FGN) — play.fgn.gg

A competitive gaming platform connecting ISP-sponsored communities with tournaments, challenges, ranked ladders, and achievement systems. Built for multi-tenant broadband providers who want to offer branded esports experiences to their subscribers.

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
| **State** | TanStack React Query (server state), React Context (auth) |
| **Backend** | Lovable Cloud (Supabase) — Auth, PostgreSQL, Edge Functions, Storage |
| **Routing** | React Router v6 (SPA with nested layouts) |
| **Animations** | tsparticles (hero backgrounds) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |

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
│   ├── coach/            # AI coach chat history panel
│   ├── auth/             # Registration sub-steps (ZIP check, subscriber verify)
│   ├── compare/          # Player comparison charts and tables
│   ├── games/            # Game cards, add game dialog
│   ├── media/            # Media library grid, uploader, AI image generator, editor
│   ├── player/           # Player profile header, stats grid, achievements, match history
│   ├── stats/            # Game stats, player stats report, skill insights
│   ├── ui/               # shadcn/ui primitives (button, dialog, table, etc.)
│   └── ...               # Navbar, Sidebar, ErrorBoundary, CookieConsent, etc.
├── contexts/
│   ├── AuthContext.tsx    # Session, roles (isAdmin/isModerator/isMarketing), Discord status
│   └── CoachContext.tsx   # AI coach conversation state
├── hooks/                # 60+ custom hooks for data fetching & mutations
│   ├── useTournaments.ts         # Tournament CRUD & registration
│   ├── useChallengeDetail.ts     # Challenge enrollment & evidence management
│   ├── useLeaderboard.ts         # Seasonal leaderboard queries
│   ├── useTenantAdmin.ts         # Tenant role detection & info
│   ├── useCoachChat.ts           # AI coach message send/receive
│   ├── useMediaLibrary.ts        # Media upload, tagging, deletion
│   └── ...
├── pages/                # Route-level page components
│   ├── admin/            # 15 admin dashboard pages
│   ├── moderator/        # 8 moderator management pages
│   └── tenant/           # 11 ISP tenant portal pages
├── integrations/
│   └── supabase/
│       ├── client.ts     # Auto-generated Supabase client (DO NOT EDIT)
│       └── types.ts      # Auto-generated TypeScript types from DB schema (DO NOT EDIT)
├── lib/                  # Utility functions (export, image resize, notifications)
└── assets/               # Static images (game covers, hero backgrounds, logos)

supabase/
├── config.toml           # Edge function configuration (DO NOT EDIT)
├── functions/            # 17 Deno edge functions
│   ├── _shared/          # Shared email templates (signup, recovery, invite, etc.)
│   ├── ai-coach/         # AI-powered game coaching
│   ├── award-season-points/      # Tournament placement point awards
│   ├── discord-oauth-callback/   # Discord OAuth linking
│   ├── ecosystem-magic-link/     # Cross-app SSO token generation
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
| **Admin** | `admin` | Full platform: users, games, seasons, settings, tenants, media, bypass codes, legacy users |
| **Moderator** | `moderator` | Tournament management, match scoring, point adjustments, challenges, ladders, prize redemptions |
| **Marketing** | `marketing` | Campaign creation, branded calendar publishing, marketing assets |
| **Player** | _(default)_ | Tournaments, challenges, community, prize shop, leaderboard, achievements |

### Tenant Roles

Stored in `tenant_admins` table with a text `role` field (not the `app_role` enum).

| Role | Access |
|------|--------|
| **Tenant Admin** (`admin`) | Full ISP portal: events, subscribers, billing config, team management, ZIP codes |
| **Tenant Marketing** (`marketing`) | Marketing assets and branded calendars for their tenant |

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
| `/events/:tenantSlug` | `TenantEventPage` | Public tenant event listing |
| `/events/:tenantSlug/:eventId` | `TenantEventDetail` | Public event detail |
| `/embed/calendar/:configId` | `EmbedCalendar` | Embeddable tournament calendar (iframe) |

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
| `/prize-shop` | `PrizeShop` | Redeem points for prizes |
| `/ladders` | `Ladders` | Ranked ladder standings |
| `/guide` | `PlayerGuide` | Searchable player guide |
| `/profile` | `ProfileSettings` | Edit profile, avatar, gamer tag |
| `/link-discord` | `LinkDiscord` | Discord OAuth linking (pre-dashboard gate) |

### Admin Routes (`/admin/*`)

15 pages covering: Dashboard, Users, Games, Tournaments, Seasons, Achievements, Media Library, Settings, Bypass Codes, Tenants, Notebooks, Marketing, Access Requests, Legacy Users, Admin Guide.

### Moderator Routes (`/moderator/*`)

8 pages covering: Dashboard, Tournaments, Matches, Points, Challenges, Ladders, Redemptions, Moderator Guide.

### Tenant Routes (`/tenant/*`)

11 pages covering: Dashboard, Players, Leads, ZIP Codes, Subscribers, Team, Settings, Marketing, Marketing Assets, Marketing Detail, Events.

---

## Key Features

### Tournament System
- Full CRUD with game selection, format, dates, prize pools
- Bracket generation and round-by-round match scoring
- Player registration with capacity enforcement
- Email + in-app notifications at every lifecycle stage
- Calendar view with embeddable widget for tenant co-branding

### Challenge System (Work Orders)
- Created by moderators with optional task checklists
- Players enroll, complete tasks, upload evidence (images/videos)
- Per-evidence moderator review with approve/reject + feedback notes
- AI-enhanced challenge descriptions via `enhance-challenge-description` edge function

### Ranked Ladders
- ELO-based rating system
- Moderator-managed match results
- Per-game ladder standings

### Seasonal Leaderboard
- Point accumulation across tournaments and challenges
- Season rotation with `rotate-season` edge function
- Historical snapshots in `season_snapshots` table
- Point adjustments by moderators (bonus/penalty)

### Achievement System
- Admin-defined achievements with tiers (bronze/silver/gold/platinum)
- Auto-criteria evaluation + manual award by admins
- Progress tracking with notifications on unlock

### Prize Shop
- Point-based redemptions with stock management
- Moderator review workflow (pending → approved → fulfilled / denied)
- Automatic point deduction on approval via DB trigger
- Stock decrement via DB trigger

### AI Coach
- Game-specific coaching via floating chat panel
- Conversation history persisted in `coach_conversations` / `coach_messages`
- Powered by Lovable AI (no external API key required)

### Community Forum
- Threaded posts with replies, likes, pinning
- Category-based organization
- Admin/moderator moderation controls

### Media Library
- Upload images/videos to `app-media` storage bucket
- AI image generation via `generate-media-image` edge function
- Tagging, categories, inline editor with canvas tools

### Player Profiles
- Avatar upload, gamer tag, display name
- Match history, achievement showcase
- Head-to-head comparison with other players
- Skill insights and game-specific stats

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
| `tenant_integrations` | Billing system API connections (NISC, GLDS) |
| `tenant_zip_codes` | Service area ZIP codes |
| `tenant_marketing_assets` | Co-branded marketing materials |

### Subscriber Sync

Two billing system integrations:

1. **NISC**: `nisc-sync` edge function pulls from NISC API
2. **GLDS**: `glds-sync` edge function pulls from GLDS API

Both sync to `tenant_subscribers` with deduplication via `external_id`.

### Public Event Pages

Tenants get public event pages at `/events/:tenantSlug` and `/events/:tenantSlug/:eventId`, accessible without authentication.

---

## Edge Functions

All edge functions are Deno-based, deployed automatically, and located in `supabase/functions/`.

| Function | Purpose | Trigger | Auth Required |
|----------|---------|---------|---------------|
| `ai-coach` | AI game coaching responses | HTTP (client) | No (JWT disabled) |
| `auth-email-hook` | Custom branded email templates for auth events | Auth webhook | No |
| `award-season-points` | Award points for tournament placements | HTTP (moderator) | No (JWT disabled) |
| `discord-oauth-callback` | Handle Discord OAuth flow, link accounts, assign roles | HTTP (redirect) | No |
| `ecosystem-magic-link` | Generate cross-app SSO tokens | HTTP (client) | No (JWT disabled) |
| `enhance-challenge-description` | AI-enhance challenge descriptions | HTTP (moderator) | No (JWT disabled) |
| `generate-media-image` | AI image generation for media library | HTTP (admin) | No (JWT disabled) |
| `glds-sync` | Sync subscribers from GLDS billing system | HTTP (tenant admin) | No (JWT disabled) |
| `import-legacy-users` | Bulk import legacy user records | HTTP (admin) | No (JWT disabled) |
| `match-legacy-user` | Match current user to legacy record | HTTP (client) | N/A |
| `nisc-sync` | Sync subscribers from NISC billing system | HTTP (tenant admin) | No (JWT disabled) |
| `notebook-proxy` | Proxy requests to Open Notebook instances | HTTP (admin) | No (JWT disabled) |
| `rotate-season` | End current season, snapshot standings, start new | HTTP (admin) | No (JWT disabled) |
| `send-notification-email` | Send templated notification emails via Resend | HTTP (DB trigger) | N/A |
| `send-tournament-email` | Send tournament-specific email notifications | HTTP (DB trigger) | N/A |
| `tournament-reminders` | Send upcoming tournament reminder emails | Cron / HTTP | N/A |
| `validate-ecosystem-token` | Validate cross-app magic link tokens | HTTP | No |
| `validate-subscriber` | Verify user is active ISP subscriber during registration | HTTP | N/A |
| `validate-zip` | Validate ZIP code via SmartyStreets API | HTTP | N/A |

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

### Key Tables (40+ tables total)

| Category | Tables |
|----------|--------|
| **Auth & Profiles** | `profiles`, `user_roles`, `access_requests`, `bypass_codes` |
| **Tournaments** | `tournaments`, `tournament_registrations`, `match_results` |
| **Challenges** | `challenges`, `challenge_tasks`, `challenge_enrollments`, `challenge_evidence`, `challenge_completions` |
| **Seasons** | `seasons`, `season_scores`, `season_snapshots`, `point_adjustments` |
| **Achievements** | `achievement_definitions`, `player_achievements` |
| **Prizes** | `prizes`, `prize_redemptions` |
| **Ladders** | `ladders`, `ladder_entries` |
| **Community** | `community_posts`, `community_likes` |
| **AI Coach** | `coach_conversations`, `coach_messages` |
| **Notifications** | `notifications`, `notification_preferences` |
| **Games** | `games` |
| **Media** | `media_library` |
| **Tenant** | `tenants`, `tenant_admins`, `tenant_subscribers`, `tenant_events`, `tenant_event_assets`, `tenant_event_registrations`, `tenant_integrations`, `tenant_zip_codes`, `tenant_marketing_assets` |
| **Marketing** | `marketing_campaigns`, `marketing_assets`, `calendar_publish_configs` |
| **Ecosystem** | `ecosystem_auth_tokens` |
| **Admin** | `app_settings`, `managed_pages`, `page_backgrounds`, `page_hero_images`, `admin_notebook_connections`, `legacy_users`, `national_zip_codes` |

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
| `app-media` | Yes | Challenge evidence, media library uploads, marketing assets, event images |
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
| `RESEND_API_KEY` | `send-notification-email`, `send-tournament-email` | Email delivery via Resend |
| `DISCORD_CLIENT_ID` | `discord-oauth-callback` | Discord OAuth app ID |
| `DISCORD_CLIENT_SECRET` | `discord-oauth-callback` | Discord OAuth app secret |
| `DISCORD_BOT_TOKEN` | `discord-oauth-callback` | Discord bot for role assignment |
| `DISCORD_GUILD_ID` | `discord-oauth-callback` | Target Discord server |
| `DISCORD_VERIFIED_ROLE_ID` | `discord-oauth-callback` | Role to assign on verification |
| `SMARTY_AUTH_ID` | `validate-zip` | SmartyStreets API auth |
| `SMARTY_AUTH_TOKEN` | `validate-zip` | SmartyStreets API token |
| `LOVABLE_API_KEY` | `ai-coach`, `generate-media-image`, `enhance-challenge-description` | Lovable AI features |
| `OPEN_NOTEBOOK_URL` | `notebook-proxy` | Open Notebook instance URL |
| `OPEN_NOTEBOOK_PASSWORD` | `notebook-proxy` | Open Notebook auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Multiple functions | Service role for admin operations |

---

## Ecosystem Integration

FGN operates as part of a three-app ecosystem:

| App | Domain | Purpose |
|-----|--------|---------|
| **FGN Play** | `play.fgn.gg` | This app — gaming platform |
| **FGN Manage** | `manage.fgn.gg` | ISP subscriber verification portal |
| **FGN Hub** | `hub.fgn.gg` | Partner hub for creative assets |

Cross-app navigation uses magic link tokens generated by `ecosystem-magic-link` and validated by `validate-ecosystem-token` edge functions. Tokens are stored in `ecosystem_auth_tokens` and expire after use.

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
- **Hooks**: `use` prefix, camelCase (`useTournaments.ts`, `useChallengeEnrollment.ts`)
- **Components**: PascalCase, grouped by domain folder (`tournaments/`, `challenges/`, `admin/`)
- **Edge Functions**: kebab-case directory names (`ai-coach/`, `discord-oauth-callback/`)

### Architecture Decisions

- All color values use HSL via CSS custom properties (design tokens in `index.css`)
- Server state managed exclusively via TanStack React Query with cache invalidation
- Auth state in React Context (`AuthContext`) — roles derived from array, not single value
- RLS policies use SECURITY DEFINER helper functions to avoid recursion
- No direct foreign keys to `auth.users` — soft reference via `user_id uuid`

### For Detailed Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for in-depth documentation of the multi-tenant system, tournament lifecycle, challenge workflow, notification triggers, and database conventions.
