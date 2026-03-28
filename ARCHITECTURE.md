# FGN Platform Architecture

> **Last updated**: 2026-03-28
> Comprehensive developer onboarding guide for the Fibre Gaming Network codebase.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Authentication & Registration Flow](#authentication--registration-flow)
- [RBAC Implementation](#rbac-implementation)
- [Route Architecture](#route-architecture)
- [Multi-Tenant (ISP) System](#multi-tenant-isp-system)
- [Tournament Lifecycle](#tournament-lifecycle)
- [Challenge / Work Order System](#challenge--work-order-system)
- [Quest / Quest Chain System](#quest--quest-chain-system)
- [Seasonal Points & Leaderboard](#seasonal-points--leaderboard)
- [AI Coach](#ai-coach)
- [Game Server Directory](#game-server-directory)
- [Cloud Gaming](#cloud-gaming)
- [Stripe Billing](#stripe-billing)
- [FGN Academy Integration](#fgn-academy-integration)
- [Scheduled Social Publishing](#scheduled-social-publishing)
- [Notification System](#notification-system)
- [Edge Functions Inventory](#edge-functions-inventory)
- [Database Design](#database-design)
- [Storage Buckets](#storage-buckets)
- [Ecosystem Integration](#ecosystem-integration)
- [Error Handling & Resilience](#error-handling--resilience)
- [Design System & Theming](#design-system--theming)
- [Naming Conventions](#naming-conventions)
- [Key Patterns & Anti-Patterns](#key-patterns--anti-patterns)

---

## Overview

FGN (Fibre Gaming Network) is a React SPA backed by Lovable Cloud (Supabase). It serves as a competitive gaming portal for ISP-sponsored communities, supporting multiple tenants (ISPs), each with their own subscriber bases, events, and marketing capabilities.

**Tech Stack**: React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack React Query · React Router v6 · Supabase (Auth, PostgreSQL, Edge Functions, Storage, Realtime)

---

## Project Structure

```
src/
├── assets/               # Static images (game covers, hero backgrounds, logos)
├── components/           # Reusable UI components, grouped by domain
│   ├── admin/            # AdminLayout, AdminSidebar, AdminRoute, MarketingRoute
│   ├── auth/             # ZipCheckStep, SubscriberVerifyStep
│   ├── challenges/       # ChallengeCard, EvidenceUpload, TaskChecklist
│   ├── coach/            # CoachHistoryPanel, CoachProfileCard
│   ├── community/        # CreateTopicDialog, TopicDetail
│   ├── compare/          # ComparisonChart, PlayerSelector, HeadToHeadHistory
│   ├── games/            # GameCard, AddGameDialog
│   ├── marketing/        # EventPromoEditor, ScheduledPostsCalendar, SocialAccountsManager
│   ├── media/            # MediaGrid, MediaUploader, AIImageGenerator, AssetEditorDialog
│   ├── moderator/        # ModeratorLayout, ModeratorSidebar, ModeratorRoute
│   ├── player/           # PlayerProfileHeader, PlayerStatsGrid, PlayerAchievements
│   ├── quests/           # QuestCard, QuestChainCard, StoryNarrative, QuestRankBadge
│   ├── shared/           # AchievementBadgeDisplay, PointsWalletCard
│   ├── stats/            # GameStatsView, MyStatsView, SkillInsightsPanel
│   ├── tenant/           # TenantLayout, TenantSidebar, TenantRoute, CloudGamingSeatsCard
│   ├── tournaments/      # TournamentCard, BracketMatchCard, CreateTournamentDialog
│   ├── webpages/         # WebPageEditor, SectionEditor, SectionPreview
│   └── ui/               # shadcn/ui primitives (50+ components)
├── contexts/
│   ├── AuthContext.tsx    # Session, multi-role state (isAdmin/isModerator/isMarketing), Discord, billing
│   └── CoachContext.tsx   # AI coach conversation state & floating panel toggle
├── hooks/                # 80+ custom hooks
│   ├── canvas/           # Canvas editor types & history management
│   ├── use*.ts           # Data fetching, mutations, business logic
│   └── ...
├── integrations/
│   └── supabase/
│       ├── client.ts     # ⚠️ AUTO-GENERATED — DO NOT EDIT
│       └── types.ts      # ⚠️ AUTO-GENERATED — DO NOT EDIT
├── lib/                  # Utility functions (export, image resize, notifications, Stripe products)
├── pages/                # Route-level page components
│   ├── admin/            # 18 admin pages
│   ├── guides/           # Player-facing guide pages (Challenge, Quest, Tournament)
│   ├── moderator/        # 9 moderator pages
│   └── tenant/           # 14 ISP tenant portal pages
└── main.tsx              # App entry point with ErrorBoundary wrapper

supabase/
├── config.toml           # ⚠️ AUTO-MANAGED — DO NOT EDIT
├── functions/            # 50 Deno edge functions (auto-deployed)
│   ├── _shared/          # Shared email templates (React TSX via @react-email)
│   └── <function-name>/  # Each function has its own directory with index.ts
└── migrations/           # ⚠️ AUTO-GENERATED — sequential SQL migration files
```

### Files You Must NOT Edit

| File | Reason |
|------|--------|
| `src/integrations/supabase/client.ts` | Auto-generated Supabase client |
| `src/integrations/supabase/types.ts` | Auto-generated TypeScript types from DB schema |
| `supabase/config.toml` | Managed by Lovable Cloud |
| `.env` | Auto-populated with Supabase credentials |
| `supabase/migrations/*` | Generated by migration tool |

---

## Authentication & Registration Flow

### Registration Funnel (Multi-Step)

```
ZIP Code Input
    ↓ (validated via Smarty API — validate-zip edge function)
Provider Selection (if multiple ISPs in that ZIP)
    ↓
Subscriber Verification (optional per-tenant toggle)
    ↓ (validate-subscriber edge function checks tenant_subscribers table or live billing API)
Email + Password Signup
    ↓ (Supabase Auth creates user → handle_new_user trigger creates profile)
Email Verification
    ↓
Discord OAuth Linking (mandatory gate via /link-discord)
    ↓ (discord-oauth-callback edge function)
Dashboard Access
```

### Bypass Path (No ISP Coverage)

If no providers serve a ZIP code, users can:
1. Enter a **bypass code** (validated via `validate_bypass_code()` DB function)
2. Submit an **Access Request** for manual admin review
   - Approved requests auto-generate single-use bypass codes (prefixed `AR-`)
   - Duplicate prevention via partial unique index `uq_access_requests_email_active`

### Session Management

- Supabase Auth manages JWT sessions
- `AuthContext` listens to `onAuthStateChange` and fetches roles + Discord status + billing status
- `ProtectedRoute` component enforces authentication + Discord linking before app access

---

## RBAC Implementation

### Platform Roles

Stored in `user_roles` table using `app_role` enum: `admin`, `moderator`, `marketing`, `user`.

**Critical design**: A user can hold **multiple concurrent roles** (e.g., admin + moderator). `AuthContext` fetches **all** roles via `.select("role").eq("user_id", userId)` and derives boolean flags:

```typescript
const roles = (roleResult.data ?? []).map((r) => r.role);
setIsAdmin(roles.includes("admin"));
setIsModerator(roles.includes("moderator"));
setIsMarketing(roles.includes("marketing"));
```

### Tenant Roles

Stored in `tenant_admins` table with a text `role` field: `admin`, `manager`, `marketing`.

### Server-Side Enforcement (RLS)

All RLS policies use `SECURITY DEFINER` helper functions to prevent recursive policy evaluation:

| Function | Purpose |
|----------|---------|
| `has_role(user_id, role)` | Check platform role (admin, moderator, marketing) |
| `is_tenant_member(tenant_id, user_id)` | Any tenant role membership |
| `is_tenant_admin(tenant_id, user_id)` | Tenant admin only |
| `is_tenant_marketing_member(tenant_id, user_id)` | Tenant admin or marketing |
| `should_notify(user_id, type, channel)` | Check notification opt-in before sending |
| `validate_bypass_code(code)` | Validate + increment bypass code usage |
| `lookup_providers_by_zip(zip)` | Find ISPs serving a ZIP code |

### Client-Side Route Guards

| Component | Access Rule |
|-----------|------------|
| `AdminRoute` | `isAdmin === true` |
| `ModeratorRoute` | `isAdmin \|\| isModerator` |
| `MarketingRoute` | `isAdmin \|\| isMarketing` |
| `TenantRoute` | Checks `tenant_admins` membership via `useTenantAdmin` hook |
| `ProtectedRoute` | Authenticated + Discord linked (except `/link-discord`) |

---

## Route Architecture

### Public Routes (No Auth)

| Path | Page | Description |
|------|------|-------------|
| `/` | Index | Landing page with hero, featured tournaments |
| `/auth` | Auth | Login/register with multi-step onboarding |
| `/terms` | Terms | Terms of Service |
| `/privacy` | PrivacyPolicy | Privacy Policy |
| `/acceptable-use` | AcceptableUsePolicy | Acceptable Use Policy |
| `/disabled-users` | DisabledUsersNotice | Disability accommodations |
| `/reset-password` | ResetPassword | Password reset flow |
| `/confirm-email` | ConfirmEmail | Email confirmation landing |
| `/for-providers` | ForProviders | Self-service tenant signup |
| `/white-paper` | WhitePaper | Platform white paper |
| `/events/:tenantSlug` | TenantEventPage | Public tenant event listing |
| `/events/:tenantSlug/:eventId` | TenantEventDetail | Public event detail |
| `/embed/calendar/:configId` | EmbedCalendar | Embeddable tournament calendar (iframe) |
| `/pages/:tenantSlug/:pageSlug` | WebPageView | Tenant-published web pages |

### Player Routes (Auth + Discord Required)

| Path | Page |
|------|------|
| `/dashboard` | Dashboard (stats, upcoming tournaments, recent activity) |
| `/tournaments` | Tournament list |
| `/tournaments/:id` | Tournament detail + registration |
| `/tournaments/:id/bracket` | Live bracket view |
| `/tournaments/:id/manage` | Tournament management (creator only) |
| `/calendar` | Tournament calendar |
| `/community` | Community forum |
| `/leaderboard` | Seasonal leaderboard |
| `/season-stats` | Personal season statistics |
| `/compare` | Head-to-head player comparison |
| `/achievements` | Achievement gallery |
| `/games` | Game library |
| `/games/:slug` | Game detail + guides |
| `/player/:id` | Player profile |
| `/challenges` | Challenge list |
| `/challenges/:id` | Challenge detail + evidence submission |
| `/quests` | Quest list with chain navigation |
| `/quests/:id` | Quest detail + story narrative + evidence |
| `/prize-shop` | Prize redemption shop |
| `/guide` | Player guide |
| `/guide/tournaments` | Tournament-specific guide |
| `/guide/challenges` | Challenge-specific guide |
| `/guide/quests` | Quest-specific guide |
| `/ladders` | Ranked ladders |
| `/game-servers` | Game server directory |
| `/servers` | Game server directory (alias) |
| `/media-library` | Media library browser |
| `/profile` | Profile settings (avatar, gamertag, Discord) |

### Admin Routes (`/admin/*`)

18 pages: Dashboard, Users, Tournaments, Games, Media, Bypass Codes, Tenants, Settings, Notebooks, Seasons, Achievements, Guide, Marketing, Access Requests, Legacy Users, Challenges, Cloud Gaming, Ecosystem, Discord Bypass, Game Servers, Web Pages.

### Moderator Routes (`/moderator/*`)

9 pages: Dashboard, Tournaments, Matches, Points, Challenges, Ladders, Redemptions, Achievements, Guide.

### Tenant Routes (`/tenant/*`)

14 pages: Dashboard, Players, Leads, ZIP Codes, Subscribers, Team, Settings, Marketing, Marketing Assets, Marketing Detail, Events, Codes, Web Pages, Guide.

---

## Multi-Tenant (ISP) System

Each broadband provider ("Tenant") operates as an isolated organizational unit within the platform.

### Core Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Organization record: name, slug, logo, brand colors, billing config, status |
| `tenant_admins` | User-role assignments scoped to a specific tenant |
| `tenant_subscribers` | Synced subscriber list (name, email, account#, plan, status) |
| `tenant_zip_codes` | Service area ZIP codes (used for registration gating) |
| `tenant_events` | Local tournaments/events (isolated from platform tournaments) |
| `tenant_event_assets` | Promotional images attached to events |
| `tenant_event_registrations` | Event RSVPs |
| `tenant_integrations` | Billing system API connections (NISC, GLDS, FGN Academy) |
| `tenant_sync_logs` | Audit log for subscriber sync operations |
| `tenant_marketing_assets` | Co-branded marketing materials |
| `tenant_cloud_gaming` | Cloud gaming configuration per tenant |
| `tenant_campaign_codes` | Campaign/promo codes for tenant onboarding |
| `tenant_subscriptions` | Stripe subscription records for tenant billing |
| `tenant_web_pages` / `tenant_web_page_sections` | CMS-style web pages |

### Subscriber Sync Pipeline

```
Billing System (NISC/GLDS) → Edge Function → tenant_subscribers table
                                  ↓
                         tenant_sync_logs (audit)
```

- **NISC**: `nisc-sync` edge function — pulls from NISC billing API
- **GLDS**: `glds-sync` edge function — pulls from GLDS billing API
- Both deduplicate via `external_id` field
- CSV upload supported as manual alternative via `SubscriberUploader` component

### Self-Service Tenant Signup

The `/for-providers` page offers a self-service flow:
1. Provider fills out signup form (org name, contact, ZIP codes)
2. `provision-tenant` edge function creates the tenant record + admin role
3. Redirects to Stripe checkout via `create-checkout` for subscription billing
4. `stripe-webhook` activates the tenant on successful payment

### Service Lead Generation

When a user registers through a tenant's ZIP code, a `user_service_interests` record is created linking the user to that tenant. Tenant admins can view these leads and their status from the Tenant Dashboard.

### Public Event Pages

Tenant events can be published to unauthenticated public pages at `/events/:tenant-slug`. These pages dynamically apply the tenant's brand colors and logo via CSS custom properties.

---

## Tournament Lifecycle

```
Created (draft)
    ↓ (status: 'upcoming')
Registration Open (status: 'open')
    ↓ (players register; capacity enforced via max_participants)
In Progress (status: 'in_progress')
    ↓ (bracket generated; matches scored round-by-round)
    ↓ (each match completion → email + in-app notifications to players)
    ↓ (final match completion → notification to moderators for placement validation)
Completed (status: 'completed')
    ↓ (award-season-points edge function updates season_scores)
```

### Prize System

Tournaments support three prize types:
- **Points**: Season points awarded by placement (1st/2nd/3rd/participation)
- **Prize Pool**: Cash/value pool split by percentage
- **Catalog Prize**: Link to a prize from the `prizes` table

---

## Challenge / Work Order System

Challenges are task-based activities (e.g., "Complete 5 matches", "Submit a highlight clip") that award points outside the tournament system.

### Schema Highlights

The `challenges` table includes:
- `certification_description` (text) — optional description used by external systems (e.g., FGN Academy) to describe the certification value of completing a challenge
- `achievement_id` — optional link to an achievement awarded on completion
- `season_id` — optional season scoping
- `points_first`, `points_second`, `points_third`, `points_participation` — placement-based point values

### Lifecycle

1. **Created** by moderator — with optional task checklist (`challenge_tasks`), difficulty level, point values, and date range
2. **Enrolled** by player — creates `challenge_enrollments` record
3. **Evidence uploaded** per-task — images/videos stored in `app-media` bucket, metadata in `challenge_evidence`
4. **Per-evidence review** — Moderators approve/reject individual evidence items with feedback notes
5. **Completion** — When all required evidence is approved, player earns points
6. **Academy Sync** — If FGN Academy integration is active, completion triggers `sync-to-academy` (see [FGN Academy Integration](#fgn-academy-integration))

### Evidence Management

- Supported types: images and video files
- Players can delete their own pending evidence
- Moderators can add reviewer notes per evidence item
- Evidence is linked to specific tasks via `task_id`

---

## Quest / Quest Chain System

Quests extend the challenge model with story narratives, XP-based ranking, and sequential chains.

### Core Tables

| Table | Purpose |
|-------|---------|
| `quests` | Quest definitions (similar schema to challenges + narrative fields) |
| `quest_tasks` | Task checklist for each quest |
| `quest_enrollments` | Player enrollment tracking |
| `quest_evidence` | Per-task evidence submissions |
| `quest_completions` | Completion records with awarded points |
| `quest_chains` | Ordered sequences of quests forming a storyline |
| `quest_chain_quests` | Junction table linking quests to chains with `display_order` |
| `quest_task_point_awards` | Tracks per-task point awards (prevents double-payout) |

### Per-Task Reward Model

Unlike challenges which award points at completion, quests use **incremental per-task rewards**:
- When a moderator approves task evidence, points (`points_first` value) are awarded immediately
- The `quest_task_point_awards` table ensures each task is rewarded exactly once
- Final quest completion status serves as a milestone for XP, achievements, and chain progression — no additional points

### XP Rank Tiers

| Rank | XP Threshold |
|------|-------------|
| Novice | 0 |
| Apprentice | 100 |
| Journeyman | 300 |
| Expert | 600 |
| Master | 1000 |
| Grandmaster | 2000 |
| Legend | 5000 |

### Story Narratives

- **Story Intro**: Visible to all visitors, sets the scene before enrollment
- **Story Outro**: Unlocked only upon quest completion, reveals the conclusion
- Both support AI enhancement via `enhance-quest-narrative` edge function (master storyteller persona)

### Quest Chains

Sequential quest series where completing one quest unlocks the next. Chain progress is tracked via the `quest_chain_quests` junction table with `display_order`.

---

## Seasonal Points & Leaderboard

### Tables

| Table | Purpose |
|-------|---------|
| `seasons` | Season definitions with date ranges and status (active/completed) |
| `season_scores` | Per-user per-season: points, points_available, wins, losses, tournaments_played |
| `season_snapshots` | Frozen final standings archived when a season rotates |
| `point_adjustments` | Manual point modifications by moderators (with reason + audit) |

### Point Sources

- Tournament placements (1st/2nd/3rd/participation) — via `award-season-points` edge function
- Challenge completions — via `challenge_completions` table
- Quest task approvals — via `quest_task_point_awards` table
- Manual adjustments — via moderator `point_adjustments`

### Season Rotation

The `rotate-season` edge function:
1. Snapshots all current `season_scores` into `season_snapshots` with tier assignments
2. Marks current season as `completed`
3. Creates and activates the next season
4. Resets all player scores

### Spendable Points

`points_available` tracks spendable balance separately from total `points`. Prize redemptions deduct from `points_available` via the `deduct_points_on_approval()` trigger.

---

## AI Coach

The AI Coach provides game-specific coaching via a floating chat panel accessible from any page.

### Architecture (RAG)

```
User Message + Game Context
    ↓
ai-coach edge function
    ↓ (concurrent multi-source search)
    ├── Open Notebook connections (external knowledge bases)
    └── Local markdown guides (from games.guide_content)
    ↓
Context aggregation with source attribution
    ↓
google/gemini-3-flash-preview (via Lovable AI Gateway)
    ↓
Streamed response with citations
```

### Persistence

- `coach_conversations` — conversation metadata (title, game_id, user_id)
- `coach_messages` — individual messages (content, role, conversation_id)
- `coach_player_profiles` — player coaching preferences and stats summaries
- `coach_player_files` — uploaded game stats files with extracted text
- Session resumption across devices via conversation history panel

---

## Game Server Directory

The platform provides a browsable directory of dedicated game servers for community play.

### Architecture

| Table | Purpose |
|-------|---------|
| `game_servers` | Server records: name, IP, port, game, status, connection instructions |

### Features

- **Admin Management**: Add/edit/remove servers with image uploads and AI-enhanced descriptions
- **Game Linking**: Servers linked to the `games` catalog via `game_id` for metadata inheritance
- **Live Status Polling**: Optional Pterodactyl Panel integration via `game-server-status` edge function
- **Player View**: Interactive card grid with status indicators, one-click IP copy, collapsible "How to Join"
- **Shockbyte Integration**: Optimized for Shockbyte hosting with panel URL/server ID fields

### Routes

- `/game-servers` and `/servers` (alias) — player-facing server browser
- `/admin/game-servers` — admin management interface

---

## Cloud Gaming

Tenants can offer cloud gaming access to their subscribers via Blacknut integration.

### Architecture

| Table | Purpose |
|-------|---------|
| `tenant_cloud_gaming` | Per-tenant config: enabled, max_seats, subscription_tier, blacknut_account_id |
| `subscriber_cloud_access` | Individual seat assignments: subscriber, activation date, status |
| `cloud_games` | Catalog of available cloud games (blacknut_game_id, title, genre, deep_link_url) |

### Billing

Cloud gaming seats are billed as Stripe per-seat subscriptions ($29.99/mo per seat). The `stripe-webhook` edge function handles activation/deactivation of seats based on subscription lifecycle events.

### Admin Interface

- `/admin/cloud-gaming` — platform-wide cloud game catalog management
- Tenant Settings → Cloud Gaming card — per-tenant seat management and configuration

---

## Stripe Billing

### Tenant Subscriptions

Tenants subscribe to the platform via Stripe:

```
/for-providers signup → provision-tenant → create-checkout → Stripe Payment
                                                                  ↓
                                                         stripe-webhook
                                                                  ↓
                                                    tenant.status = 'active'
                                                    tenant_subscriptions record
```

### Edge Functions

| Function | Purpose |
|----------|---------|
| `create-checkout` | Creates Stripe Checkout sessions for tenant subscriptions |
| `customer-portal` | Generates Stripe Customer Portal URLs for subscription management |
| `check-subscription` | Verifies active subscription status |
| `stripe-webhook` | Processes Stripe events (checkout.completed, subscription.updated/deleted) |

### Products (defined in `src/lib/stripeProducts.ts`)

| Product | Price |
|---------|-------|
| Tenant Basic | $850/mo |
| Cloud Gaming Seat | $29.99/mo |

### Billing Status in AuthContext

`AuthContext` checks subscription status globally, enabling feature gating across the platform. The `TenantBillingCard` component is contextually hidden for tenants with active subscriptions.

---

## FGN Academy Integration

### Overview

The FGN Academy integration enables automated syncing of challenge completions to the academy's Skill Passport system. See [docs/play-fgn-gg-integration-guide.md](docs/play-fgn-gg-integration-guide.md) for the full payload contract.

### Sync Pipeline

```
Challenge Approved (moderator action)
    ↓
sync-to-academy edge function
    ↓ (flat JSON payload: user_email, challenge_id, score, task_progress[], skills_verified[])
    ↓ POST to academy API with X-App-Key header
    ↓
challenge_completions.academy_synced = true/false
challenge_completions.academy_sync_note = status message
    ↓
ecosystem_sync_log entry
```

### Payload Contract

The sync uses a **flat** JSON structure (not nested):
- `user_email` — resolved from auth.users
- `challenge_id`, `score` (0–100), `completed_at`
- `task_progress[]` — per-task completion status with `task_id`, `title`, `completed`, `status`, `completed_at`
- `skills_verified[]` — free-form tags (e.g., `difficulty:intermediate`, `game:Rocket League`)
- `metadata{}` — additional context (display_name, challenge_name, awarded_points, etc.)

### Player-Facing UX

- **Academy Sync Banner**: If a challenge sync returns 404 (user not found on academy), a "Join FGN Academy" banner appears on the ChallengeDetail page prompting the player to sign up with the same email
- **Sync Status Toasts**: Admins and moderators see real-time toast notifications during approval flows indicating sync success/failure
- **Retry Button**: "Retry Academy Sync" button available in Moderator and Admin challenge management panels

### Monitoring

The `monitor-academy-sync` edge function runs hourly via pg_cron:
1. Queries `challenge_completions` for failures in the past 24 hours
2. If failures exceed threshold (5), sends email + in-app alerts to all platform admins
3. 6-hour suppression cooldown prevents alert fatigue (tracked via `app_settings` key `last_academy_alert_sent`)

### Tenant Activation

Academy sync is platform-wide (single `FGN_ACADEMY_API_KEY`) but activated per-tenant via a toggle in Tenant Integrations settings (`provider_type: 'fgn_academy'`).

---

## Scheduled Social Publishing

### Architecture

| Table | Purpose |
|-------|---------|
| `social_accounts` | Connected social media accounts (platform, credentials) |
| `scheduled_posts` | Posts queued for future publishing with content, media, and schedule time |

### Flow

1. Marketing users create posts with content, images, and a scheduled publish time
2. The `publish-scheduled-posts` edge function (cron-triggered) checks for due posts
3. `publish-to-social` edge function handles actual delivery to connected platforms

### Management

- `SocialAccountsManager` component for connecting/disconnecting social accounts
- `ScheduledPostsCalendar` component for calendar-based post scheduling
- Available under Admin Marketing and Tenant Marketing routes

---

## Notification System

### Dual-Channel Architecture

| Channel | Mechanism | Delivery |
|---------|-----------|----------|
| **In-App** | PostgreSQL triggers → `notifications` table | Client polls via React Query |
| **Email** | PostgreSQL triggers → `send-notification-email` edge function → Resend API | HTML templates in `_shared/email-templates/` |

### Notification Types & Triggers

| Event | In-App Trigger | Email Trigger |
|-------|---------------|---------------|
| Tournament starting | `notify_tournament_starting()` | `email_tournament_starting()` |
| Registration confirmed | `notify_registration_confirmed()` | `email_registration_confirmed()` |
| Match completed | `notify_match_completed()` | `email_match_completed()` |
| Achievement earned | `notify_achievement_earned()` | `email_achievement_earned()` |
| New challenge published | `notify_new_challenge()` | `email_new_challenge()` |
| Prize redemption status | `notify_redemption_status()` | `email_redemption_status()` |
| New access request | `notify_admins_access_request()` | (included in same trigger) |
| Final match completed | `notify_moderators_tournament_complete()` | — |
| Points awarded/deducted | `notify_points_change()` | — |
| Challenge evidence approved | `notify_challenge_approved()` | `email_challenge_approved()` |
| Quest task approved | `notify_quest_task_approved()` | — |
| Academy sync alert | — | `monitor-academy-sync` edge function |

### User Preferences

The `notification_preferences` table stores per-user, per-type opt-in/opt-out for both channels. The `should_notify(user_id, type, channel)` function is called by every trigger before sending.

---

## Edge Functions Inventory

All edge functions are Deno-based, auto-deployed, and located in `supabase/functions/`.

### AI & Enhancement

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `ai-coach` | HTTP POST | AI coaching with RAG context aggregation | `LOVABLE_API_KEY`, `OPEN_NOTEBOOK_*` |
| `enhance-challenge-description` | HTTP POST | AI-enhance challenge descriptions | `LOVABLE_API_KEY` |
| `enhance-quest-narrative` | HTTP POST | AI-enhance quest story narratives | `LOVABLE_API_KEY` |
| `enhance-server-description` | HTTP POST | AI-enhance game server descriptions | `LOVABLE_API_KEY` |
| `generate-media-image` | HTTP POST | AI image generation for media library | `LOVABLE_API_KEY` |

### Authentication & Users

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `auth-email-hook` | Auth hook | Custom email templates for auth events | — |
| `check-ban-status` | HTTP POST | Check if a user is banned | `SUPABASE_SERVICE_ROLE_KEY` |
| `check-users-confirmed` | HTTP POST | Verify email confirmation status | `SUPABASE_SERVICE_ROLE_KEY` |
| `delete-user` | HTTP POST | Admin user deletion | `SUPABASE_SERVICE_ROLE_KEY` |
| `resend-confirmation` | HTTP POST | Resend email confirmation | `SUPABASE_SERVICE_ROLE_KEY` |
| `validate-zip` | HTTP POST | Validate ZIP code via Smarty API | `SMARTY_AUTH_ID`, `SMARTY_AUTH_TOKEN` |
| `validate-subscriber` | HTTP POST | Verify subscriber against tenant records | `SUPABASE_SERVICE_ROLE_KEY` |

### Discord Integration

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `discord-oauth-callback` | HTTP GET | Handle Discord OAuth redirect, link profile | `DISCORD_CLIENT_*`, `DISCORD_BOT_TOKEN` |
| `discord-server-roles` | HTTP POST | Fetch Discord server roles | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` |
| `assign-tournament-role` | HTTP POST | Assign Discord role for tournament participants | `DISCORD_BOT_TOKEN` |

### Steam Integration

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `steam-openid-callback` | HTTP GET | Handle Steam OpenID authentication | `SUPABASE_SERVICE_ROLE_KEY` |

### Tournament & Season

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `award-season-points` | HTTP POST | Award points for tournament placements | `SUPABASE_SERVICE_ROLE_KEY` |
| `rotate-season` | HTTP POST | Snapshot scores, rotate to next season | `SUPABASE_SERVICE_ROLE_KEY` |
| `tournament-reminders` | HTTP POST (cron) | Send upcoming tournament reminders | `RESEND_API_KEY` |
| `tournament-promo-email` | HTTP POST | Send tournament promotional emails | `RESEND_API_KEY` |

### Tenant & Billing

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `provision-tenant` | HTTP POST | Auto-provision new tenant organization | `SUPABASE_SERVICE_ROLE_KEY` |
| `validate-tenant-code` | HTTP POST | Validate tenant campaign/promo codes | `SUPABASE_SERVICE_ROLE_KEY` |
| `create-checkout` | HTTP POST | Create Stripe Checkout session | `STRIPE_SECRET_KEY` |
| `customer-portal` | HTTP POST | Generate Stripe Customer Portal URL | `STRIPE_SECRET_KEY` |
| `check-subscription` | HTTP POST | Verify active Stripe subscription | `STRIPE_SECRET_KEY` |
| `stripe-webhook` | HTTP POST | Process Stripe webhook events | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| `send-tenant-invite` | HTTP POST | Send tenant team invitation email | `RESEND_API_KEY` |
| `send-invite-welcome` | HTTP POST | Send welcome email to invited tenant members | `RESEND_API_KEY` |

### Subscriber Sync

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `nisc-sync` | HTTP POST | Sync subscribers from NISC billing API | `SUPABASE_SERVICE_ROLE_KEY` |
| `glds-sync` | HTTP POST | Sync subscribers from GLDS billing API | `SUPABASE_SERVICE_ROLE_KEY` |

### FGN Academy & Ecosystem

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `sync-to-academy` | HTTP POST | Sync challenge completions to FGN Academy | `FGN_ACADEMY_API_KEY` |
| `monitor-academy-sync` | HTTP POST (cron) | Alert admins if academy sync failures exceed threshold | `RESEND_API_KEY` |
| `ecosystem-data-api` | HTTP POST | REST API for ecosystem apps to pull data | `ECOSYSTEM_API_KEY` |
| `ecosystem-magic-link` | HTTP POST | Generate cross-app SSO tokens | `SUPABASE_SERVICE_ROLE_KEY` |
| `validate-ecosystem-token` | HTTP POST | Validate cross-app SSO tokens | `SUPABASE_SERVICE_ROLE_KEY` |
| `ecosystem-calendar-feed` | HTTP GET | iCal/JSON feed of tournaments and events | — |
| `ecosystem-webhook-dispatch` | HTTP POST | Dispatch webhook events to registered endpoints | `SUPABASE_SERVICE_ROLE_KEY` |

### Email & Notifications

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `send-notification-email` | HTTP POST | Send transactional emails via Resend | `RESEND_API_KEY` |
| `send-tournament-email` | HTTP POST | Send tournament-specific emails | `RESEND_API_KEY` |
| `reengagement-email` | HTTP POST (cron) | Send re-engagement emails to inactive users | `RESEND_API_KEY` |
| `weekly-recap-email` | HTTP POST (cron) | Send weekly activity recap emails | `RESEND_API_KEY` |

### Social Publishing

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `publish-scheduled-posts` | HTTP POST (cron) | Check and publish due scheduled posts | `SUPABASE_SERVICE_ROLE_KEY` |
| `publish-to-social` | HTTP POST | Deliver content to social media platforms | Platform-specific tokens |

### Game Servers

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `game-server-status` | HTTP POST | Poll Pterodactyl Panel for server status | `PTERODACTYL_API_KEY` |

### Legacy & Migration

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `import-legacy-users` | HTTP POST | Bulk import legacy user records | `SUPABASE_SERVICE_ROLE_KEY` |
| `match-legacy-user` | HTTP POST | Match current user to legacy account | `SUPABASE_SERVICE_ROLE_KEY` |
| `backfill-legacy-zips` | HTTP POST | Backfill ZIP codes for legacy users | `SUPABASE_SERVICE_ROLE_KEY` |
| `backfill-zip-geo` | HTTP POST | Backfill geo coordinates for ZIP codes | `SUPABASE_SERVICE_ROLE_KEY` |

### Knowledge Base

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `notebook-proxy` | HTTP POST | Proxy requests to Open Notebook API | `OPEN_NOTEBOOK_*` |

### Monitoring

| Function | Trigger | Purpose | Key Secrets |
|----------|---------|---------|-------------|
| `monitor-academy-sync` | HTTP POST (cron) | Hourly check for academy sync failures | `RESEND_API_KEY` |

### Shared Module: `_shared/email-templates/`

React TSX email templates for: signup confirmation, password recovery, email change, magic link, invite, and reauthentication.

---

## Database Design

### Key Conventions

- All tables use `uuid` primary keys with `gen_random_uuid()` defaults
- Timestamps use `timestamptz` defaulting to `now()`
- Soft references to `auth.users` via `user_id uuid` columns (**no FK** to `auth` schema — Supabase-reserved)
- RLS enabled on **all** tables
- `SECURITY DEFINER` functions for all cross-table role checks (prevents recursive RLS)
- Validation triggers preferred over CHECK constraints (immutability issues)
- `update_updated_at_column()` trigger on tables with `updated_at`

### Table Groups (60+ tables)

**Auth & Access**: `profiles`, `user_roles`, `access_requests`, `bypass_codes`, `banned_users`, `discord_bypass_requests`

**Tournaments & Matches**: `tournaments`, `tournament_registrations`, `match_results`

**Challenges**: `challenges`, `challenge_tasks`, `challenge_enrollments`, `challenge_evidence`, `challenge_completions`

**Quests**: `quests`, `quest_tasks`, `quest_enrollments`, `quest_evidence`, `quest_completions`, `quest_chains`, `quest_chain_quests`, `quest_task_point_awards`

**Seasons & Points**: `seasons`, `season_scores`, `season_snapshots`, `point_adjustments`

**Community**: `community_posts`, `community_likes`

**Achievements**: `achievement_definitions`, `player_achievements`

**Prizes**: `prizes`, `prize_redemptions`

**Games & Ladders**: `games`, `game_servers`, `ladders`, `ladder_entries`

**AI Coach**: `coach_conversations`, `coach_messages`, `coach_player_profiles`, `coach_player_files`

**Cloud Gaming**: `cloud_games`, `tenant_cloud_gaming`, `subscriber_cloud_access`

**Multi-Tenant**: `tenants`, `tenant_admins`, `tenant_subscribers`, `tenant_zip_codes`, `tenant_events`, `tenant_event_assets`, `tenant_event_registrations`, `tenant_integrations`, `tenant_sync_logs`, `tenant_marketing_assets`, `tenant_cloud_gaming`, `tenant_campaign_codes`, `tenant_subscriptions`, `tenant_web_pages`, `tenant_web_page_sections`

**Notifications**: `notifications`, `notification_preferences`, `engagement_email_log`

**Media & Marketing**: `media_library`, `marketing_campaigns`, `marketing_assets`, `guide_media`

**Social Publishing**: `social_accounts`, `scheduled_posts`

**Ecosystem**: `ecosystem_auth_tokens`, `ecosystem_sync_log`, `ecosystem_webhooks`, `career_path_mappings`

**Configuration**: `app_settings`, `managed_pages`, `page_backgrounds`, `page_hero_images`, `calendar_publish_configs`, `admin_notebook_connections`, `discord_role_mappings`

**Geography**: `national_zip_codes`, `user_service_interests`

**Legacy**: `legacy_users`

### Key DB Triggers

| Trigger Function | Fires On | Purpose |
|-----------------|----------|---------|
| `handle_new_user()` | `auth.users` INSERT | Creates profile row |
| `deduct_points_on_approval()` | `prize_redemptions` UPDATE | Deducts spendable points |
| `decrement_prize_stock()` | `prize_redemptions` UPDATE | Reduces prize quantity |
| `update_updated_at_column()` | Various UPDATE | Maintains `updated_at` timestamps |
| `notify_*()` / `email_*()` | Various | Dual-channel notification dispatch |

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile pictures |
| `app-media` | Yes | Challenge evidence, media library uploads, marketing assets, tournament images, game server images |
| `email-assets` | Yes | Static assets referenced in email templates |

---

## Ecosystem Integration

FGN operates as part of a multi-app ecosystem with hub-and-spoke architecture:

| App | URL | Purpose |
|-----|-----|---------|
| **FGN Play** | play.fgn.gg | Gaming platform (this app — source of truth) |
| **FGN Academy** | fgn.academy | LMS / Skill Passport |
| **FGN Manage** | manage.fgn.gg | ISP subscriber verification portal |
| **FGN Hub** | hub.fgn.gg | Partner hub for creative assets & marketing |

### Cross-App SSO

Authentication is independent per app, but admins/tenant admins can navigate between apps using magic-link SSO:
1. `ecosystem-magic-link` generates a short-lived token stored in `ecosystem_auth_tokens`
2. Target app calls `validate-ecosystem-token` to verify and auto-sign-in the user

### Ecosystem Data API

The `ecosystem-data-api` edge function provides a REST-style pull API for ecosystem apps:
- **Authentication**: `X-Ecosystem-Key` header validated against `ECOSYSTEM_API_KEY` secret
- **Actions**: `health`, `tournaments`, `tenant-events`, `challenges`, `quests`, `player-progress`, `achievements`, `season-stats`
- **Enrichment**: Challenge responses include nested tasks and game names
- **Logging**: All requests logged to `ecosystem_sync_log`

### Calendar Feed

The `ecosystem-calendar-feed` edge function provides iCal and JSON feeds of tournaments and tenant events for external calendar subscriptions.

### Webhook Dispatch

The `ecosystem-webhook-dispatch` edge function sends real-time push notifications to registered endpoints (`ecosystem_webhooks` table) with HMAC-SHA256 signature verification via `X-FGN-Signature` header.

### Career Path Mappings

The `career_path_mappings` table maps challenges and games to external career path modules (e.g., in FGN Academy), enabling automated credential tracking with configurable credit types and values.

### Integration Reference

See [docs/play-fgn-gg-integration-guide.md](docs/play-fgn-gg-integration-guide.md) for the complete integration specification including payload contracts, authentication details, and endpoint documentation.

---

## Error Handling & Resilience

### Global Error Boundary

The app is wrapped in a React `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) in `main.tsx`. Unhandled render errors display a recovery UI instead of a blank white screen.

### Data Fetching

All server-state is managed via TanStack React Query with:
- Automatic retry (default 3 attempts)
- Cache invalidation on mutations via `queryClient.invalidateQueries()`
- Toast notifications (via `sonner`) for success/error feedback on all mutations

### Cookie Consent

A `CookieConsent` banner is rendered at the app root for GDPR compliance.

---

## Design System & Theming

### Architecture

- **Design tokens** defined as CSS custom properties in `src/index.css` (HSL format)
- **Tailwind config** (`tailwind.config.ts`) maps tokens to utility classes
- **shadcn/ui** components use semantic token classes (e.g., `bg-primary`, `text-muted-foreground`)
- **Dark/Light mode** supported via `next-themes` class strategy

### Key Tokens

```
--background, --foreground          # Base surface + text
--primary, --primary-foreground     # Brand action color
--secondary, --secondary-foreground # Secondary surfaces
--muted, --muted-foreground         # Subdued elements
--accent, --accent-foreground       # Highlights
--destructive                       # Error/danger states
--card, --card-foreground           # Card surfaces
--sidebar-*                         # Sidebar-specific tokens
```

### Rule: Never Use Raw Colors in Components

Always use semantic Tailwind classes (`bg-primary`, `text-foreground`, etc.) rather than raw values (`bg-blue-500`, `text-white`). All colors must flow through the design token system.

---

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Pages | PascalCase, one per route | `TournamentBracket.tsx` |
| Hooks | `use` prefix, camelCase | `useChallengeEnrollment.ts` |
| Components | PascalCase, domain folder | `components/tournaments/BracketMatchCard.tsx` |
| Edge Functions | kebab-case directory | `supabase/functions/award-season-points/` |
| DB Tables | snake_case, plural | `tournament_registrations` |
| DB Functions | snake_case, verb-led | `deduct_points_on_approval()` |
| Contexts | PascalCase + `Context` suffix | `AuthContext.tsx` |

---

## Key Patterns & Anti-Patterns

### ✅ Do

- Use `SECURITY DEFINER` functions for cross-table RLS checks
- Fetch all user roles as an array (not `.maybeSingle()`)
- Apply layout wrappers (`AdminLayout`, `TenantLayout`) at route level, not inside pages
- Use React Query for all server-state; Context only for auth & coach state
- Validate ZIP codes server-side via edge function (never trust client)
- Use `should_notify()` before every notification trigger
- Use flat JSON payloads for ecosystem sync (not nested)

### ❌ Don't

- Add FK constraints to `auth.users` or modify `auth`/`storage`/`realtime` schemas
- Edit auto-generated files (`client.ts`, `types.ts`, `config.toml`, `.env`, `migrations/`)
- Store roles on the `profiles` table (use `user_roles` table only)
- Use `as any` type casts — use proper Supabase generated types
- Check admin status via `localStorage` or hardcoded credentials
- Create CHECK constraints with `now()` — use validation triggers instead
