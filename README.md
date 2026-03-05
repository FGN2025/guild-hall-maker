# Fibre Gaming Network (FGN)

A competitive gaming platform connecting ISP-sponsored communities with tournaments, challenges, ranked ladders, and achievement systems.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack React Query
- **Backend**: Lovable Cloud (Supabase) — Auth, PostgreSQL, Edge Functions, Storage
- **Routing**: React Router v6

## Architecture Overview

```
src/
├── components/       # Reusable UI components
│   ├── admin/        # Admin panel layouts & route guards
│   ├── moderator/    # Moderator panel layouts & route guards
│   ├── tenant/       # ISP tenant portal layouts & route guards
│   ├── tournaments/  # Tournament-specific components
│   ├── challenges/   # Challenge enrollment & evidence UI
│   ├── coach/        # AI coach chat components
│   ├── ui/           # shadcn/ui primitives
│   └── ...
├── contexts/         # React contexts (Auth, Coach)
├── hooks/            # Custom hooks (data fetching, mutations)
├── pages/            # Route-level page components
│   ├── admin/        # Admin dashboard pages
│   ├── moderator/    # Moderator management pages
│   └── tenant/       # ISP tenant portal pages
├── integrations/     # Auto-generated Supabase client & types
└── lib/              # Utility functions
```

## Role-Based Access Control (RBAC)

### Platform Roles (via `user_roles` table + `app_role` enum)
| Role | Access |
|------|--------|
| **Admin** | Full platform management: users, games, seasons, settings, tenants |
| **Moderator** | Tournament management, match scoring, point adjustments, challenges, prizes |
| **Marketing** | Campaign creation, branded calendar publishing |
| **Player** | Default role — tournaments, challenges, community, prize shop |

### Tenant Roles (via `tenant_admins` table)
| Role | Access |
|------|--------|
| **Tenant Admin** | Full ISP portal: events, subscribers, billing, team management |
| **Tenant Marketing** | Marketing assets and branded calendars for their tenant |

Role checks use `SECURITY DEFINER` PostgreSQL functions (`has_role()`, `is_tenant_member()`, `is_tenant_admin()`) to prevent RLS recursion.

## Key Features

- **Tournament System**: CRUD, bracket generation, match scoring, email/in-app notifications
- **Challenge System (Work Orders)**: Task checklists, evidence upload, per-evidence moderator review with approve/reject
- **Ranked Ladders**: ELO-based rankings with moderator management
- **Seasonal Leaderboard**: Point accumulation, season rotation, snapshot history
- **Achievement System**: Auto-criteria + manual award, tiered badges
- **Prize Shop**: Point-based redemptions with stock management
- **AI Coach**: Game-specific coaching via floating chat panel, conversation history
- **Community Forum**: Posts, replies, likes, pinning, categories
- **Multi-Tenant ISP Portal**: Events, subscriber sync (NISC/GLDS), marketing assets, embeddable calendar
- **Media Library**: Upload, AI image generation, tagging, categories
- **Notification System**: In-app + email, per-type user preferences
- **Discord Integration**: OAuth linking, verified role assignment

## Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `ai-coach` | AI-powered game coaching responses | HTTP (client) |
| `auth-email-hook` | Custom branded email templates for auth events | Auth webhook |
| `award-season-points` | Award points to tournament placements | HTTP (moderator) |
| `discord-oauth-callback` | Handle Discord OAuth flow and link accounts | HTTP (redirect) |
| `ecosystem-magic-link` | Generate cross-app magic link tokens | HTTP (client) |
| `enhance-challenge-description` | AI-enhance challenge descriptions | HTTP (moderator) |
| `generate-media-image` | AI image generation for media library | HTTP (admin) |
| `glds-sync` | Sync subscribers from GLDS billing system | HTTP (tenant) |
| `import-legacy-users` | Bulk import legacy user records | HTTP (admin) |
| `match-legacy-user` | Match current user to legacy record | HTTP (client) |
| `nisc-sync` | Sync subscribers from NISC billing system | HTTP (tenant) |
| `notebook-proxy` | Proxy requests to connected Open Notebook instances | HTTP (admin) |
| `rotate-season` | End current season and start new one with snapshots | HTTP (admin) |
| `send-notification-email` | Send templated notification emails via Resend | HTTP (DB trigger) |
| `send-tournament-email` | Send tournament-specific emails | HTTP (DB trigger) |
| `tournament-reminders` | Send upcoming tournament reminders | Cron / HTTP |
| `validate-ecosystem-token` | Validate cross-app auth tokens | HTTP |
| `validate-subscriber` | Verify user is active ISP subscriber | HTTP (registration) |
| `validate-zip` | Validate ZIP code via SmartyStreets API | HTTP (registration) |

## Environment Variables

Automatically managed by Lovable Cloud:
- `VITE_SUPABASE_URL` — Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Public anon key
- `VITE_SUPABASE_PROJECT_ID` — Project identifier

## Required Secrets (Edge Functions)

| Secret | Used By |
|--------|---------|
| `RESEND_API_KEY` | Email sending |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_BOT_TOKEN` | Discord OAuth & bot |
| `DISCORD_GUILD_ID` / `DISCORD_VERIFIED_ROLE_ID` | Discord role assignment |
| `SMARTY_AUTH_ID` / `SMARTY_AUTH_TOKEN` | ZIP code validation |
| `LOVABLE_API_KEY` | AI features (coach, image gen, description enhancement) |
| `OPEN_NOTEBOOK_URL` / `OPEN_NOTEBOOK_PASSWORD` | Notebook proxy |

## Local Development

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

## Deployment

Frontend deploys via Lovable's Publish button. Backend (edge functions, migrations) deploy automatically on commit.

## Legal Pages

- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/acceptable-use` — Acceptable Use Policy
- `/disabled-users` — Disabled Users Notice
