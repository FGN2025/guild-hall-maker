# FGN Platform Architecture

## Overview

FGN (Fibre Gaming Network) is a React SPA backed by Lovable Cloud (Supabase). It serves as a competitive gaming portal for ISP-sponsored communities, supporting multiple tenants (ISPs), each with their own subscriber bases, events, and marketing capabilities.

---

## Authentication Flow

1. **Registration**: ZIP code validation → ISP subscriber verification → email signup → Discord OAuth linking
2. **Login**: Email/password → session stored in Supabase Auth → roles fetched from `user_roles` table
3. **Discord Gate**: After auth, users must link Discord before accessing the main app (enforced by `ProtectedRoute`)
4. **Ecosystem SSO**: Magic-link tokens for cross-app authentication via `ecosystem-magic-link` and `validate-ecosystem-token` edge functions

---

## RBAC Implementation

### Platform Roles
Stored in `user_roles` table using `app_role` enum (`admin`, `moderator`, `marketing`, `user`).

**Key pattern**: A user can hold **multiple** roles. `AuthContext` fetches all roles and derives `isAdmin`, `isModerator`, `isMarketing` from the array.

### Tenant Roles
Stored in `tenant_admins` table with a text `role` field (`admin`, `marketing`).

### Server-Side Enforcement
All RLS policies use `SECURITY DEFINER` helper functions to avoid recursive policy evaluation:
- `has_role(user_id, role)` — platform role check
- `is_tenant_member(tenant_id, user_id)` — any tenant role
- `is_tenant_admin(tenant_id, user_id)` — tenant admin only
- `is_tenant_marketing_member(tenant_id, user_id)` — tenant admin or marketing

### Client-Side Route Guards
- `AdminRoute` — requires `isAdmin`
- `ModeratorRoute` — requires `isAdmin || isModerator`
- `MarketingRoute` — requires `isAdmin || isMarketing`
- `TenantRoute` — checks `tenant_admins` membership

---

## Multi-Tenant System

Each ISP tenant has:
- **`tenants`** — org record with name, slug, logo, billing config
- **`tenant_admins`** — user-role assignments scoped to tenant
- **`tenant_subscribers`** — synced subscriber list (via NISC/GLDS or CSV upload)
- **`tenant_events`** — local tournaments/events
- **`tenant_integrations`** — billing system API connections
- **`tenant_zip_codes`** — service area ZIP codes
- **`tenant_marketing_assets`** — co-branded marketing materials

### Subscriber Sync
Two integration types:
1. **NISC**: `nisc-sync` edge function pulls from NISC API
2. **GLDS**: `glds-sync` edge function pulls from GLDS API

Both sync to `tenant_subscribers` table with deduplication via `external_id`.

---

## Tournament Lifecycle

1. **Created** → Admin/Moderator creates tournament with game, format, dates, prizes
2. **Registration Open** → Players register; capacity enforced
3. **In Progress** → Bracket generated; matches scored round-by-round
4. **Completed** → Final match triggers moderator notification for placement validation
5. **Points Awarded** → `award-season-points` edge function updates `season_scores`

---

## Challenge / Work Order System

1. **Created** by moderator with optional task checklist
2. **Enrolled** by player
3. **Evidence uploaded** per-task (images/videos to `app-media` storage bucket)
4. **Per-evidence review**: Moderators approve/reject individual items with feedback
5. **Submitted for review** → Moderator reviews full enrollment
6. **Completed** or **Rejected** (player can revise and resubmit)

---

## Notification System

### In-App
PostgreSQL triggers insert into `notifications` table. Client polls via React Query.

### Email
Triggers call `send-notification-email` edge function which uses Resend API. Custom HTML templates in `supabase/functions/_shared/email-templates/`.

### User Preferences
`notification_preferences` table allows per-type opt-in/opt-out for both channels. `should_notify()` function checks before sending.

---

## Seasonal System

- **`seasons`** — active/completed seasons with date ranges
- **`season_scores`** — per-user per-season points, wins, losses
- **`season_snapshots`** — frozen final standings when season rotates
- **`rotate-season`** edge function handles the transition

---

## Database Conventions

- All tables use `uuid` primary keys with `gen_random_uuid()` defaults
- Timestamps use `timestamp with time zone` defaulting to `now()`
- Soft references to `auth.users` via `user_id uuid` (no FK to auth schema)
- RLS enabled on all tables
- `SECURITY DEFINER` functions for cross-table role checks

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | Yes | User profile pictures |
| `app-media` | Yes | Challenge evidence, media library uploads, marketing assets |
| `email-assets` | Yes | Static assets for email templates |

---

## Key Naming Conventions

- **Pages**: PascalCase, one per route (`Dashboard.tsx`, `TournamentBracket.tsx`)
- **Hooks**: `use` prefix, camelCase (`useTournaments.ts`, `useChallengeEnrollment.ts`)
- **Components**: PascalCase, grouped by domain folder
- **Edge Functions**: kebab-case directory names
