

## Update All User Guides to Reflect Recent Features

### Scope
Four guide files need content updates to their `sectionData` arrays. No structural/UI changes — text only.

### 1. Admin Guide (`src/pages/admin/AdminGuide.tsx`)

**Terminology fix**: Replace any remaining "Panel" references with "Dashboard" in bullet text.

**New/updated sections needed:**

- **Marketing Campaigns section** — Add bullets for:
  - Tabbed layout: Campaigns, Calendars, and Web Pages tabs consolidated under Marketing
  - Calendar Embeds (CalendarPublishManager) — publish branded calendar widgets for tenant external websites
  - Web Pages tab — multi-section page builder with 7 block types (Hero, Text, Image Gallery, CTA, Embed, Banner, Video)
  - Pages hosted at /pages/:tenantSlug/:pageSlug with tenant branding auto-applied
  - Standalone HTML export for external hosting

- **Media Library section** — Add bullets for:
  - Widget Library — embed code storage for third-party interactive components (Common Ninja etc.)
  - Template Gallery with thumbnail previews and locked zones for brand anchoring
  - Asset Editor — HTML5 Canvas editor with layers, snap-to-grid, social media format presets, shape primitives, z-order management, context-sensitive cursors, 2x PNG export
  - Quick Create flow (⚡) for instant asset generation from tournaments/challenges
  - Full Edit flow (✏️) for the Canvas Editor
  - "From Event" promo picker that auto-maps event data to design overlays

- **Tenant Configuration section** — Add bullets for:
  - Subscriber identity validation toggle (optional requirement during signup)
  - Email invitations for tenant staff before they register
  - Auto-claim of invitations on signup via database trigger
  - Default alphabetical tenant list sorting with Created Date and Status options
  - Inactive tenant visual distinction (reduced opacity, dashed borders)

- **Tenant Portal section** — Add bullets for:
  - Tenant Codes — campaign, override, access, tracking, verification code types
  - Access codes grant immediate entry; override/verification require manual review
  - Tenant Web Pages — page builder accessible from Marketing tab
  - Platform Admin tenant switching (localStorage, sidebar dropdown, 'Viewing as Platform Admin' indicator)

- **Permission table** — Add rows for:
  - Marketing → Web Pages (admin: ✅, marketing: ✅, manager: ✗)
  - Marketing → Calendar Embeds (admin: ✅, marketing: ✅, manager: ✗)
  - Tenant Codes (admin: ✅, marketing: read-only, manager: ✗)
  - Asset Editor (admin: ✅, marketing: ✅, manager: ✗)

- **Access Requests** — Add a new section documenting the Access Requests page visible in admin sidebar

- **Legacy Import** — Add a new section documenting the Legacy Import feature

### 2. Moderator Guide (`src/pages/moderator/ModeratorGuide.tsx`)

**Terminology**: Confirm all references say "Dashboard" not "Panel" (already done in prior pass).

**Updates:**
- **Challenges section** — Add bullets for:
  - Cover images sourced from uploads or Media Library
  - AI-enhanced descriptions (enhance-challenge-description edge function)
  - Difficulty levels: Beginner, Intermediate, Advanced
  - Estimated completion time field
  - Multi-step task checklists with per-task evidence uploads
  - Per-evidence review workflow (approve/reject individual items with feedback)
  - Bulk actions: "Approve All & Complete" and "Reject Enrollment"

- **Tournament section** — Add bullets for:
  - Multi-date scheduling from a single creation dialog (multi-mode calendar, date suffix)
  - Prize modes: None, Physical Prize (linked to Prize Shop item), Value (configurable percentage split 50/30/20)
  - Dual view modes (List/Grid) with history-based routing

- **Dashboard section** — Update to mention quick stats include active ladders count

### 3. Tenant Guide (`src/pages/tenant/TenantGuide.tsx`)

**New sections to add:**

- **Tenant Codes** (KeyRound icon) — Campaign, override, access, tracking, verification types; usage limits; expiry; access vs override/verification behavior; Admin full CRUD, Marketing read-only

- **Web Pages** (FileText icon) — Multi-section page builder; 7 block types; public hosting at /pages/:tenantSlug/:pageSlug; tenant branding auto-applied; standalone HTML export

**Updated sections:**

- **Marketing section** — Add bullets for:
  - Tabbed layout: Campaigns, My Assets, Codes, Web Pages tabs
  - "From Event" promo picker for generating promotional assets from events
  - Asset Editor for creating custom promotional materials with social media presets
  - Quick Create (⚡) and full Edit (✏️) workflows

- **My Assets section** — Add bullets for:
  - Asset Editor with Canvas-based design tools
  - Social media format presets (Instagram, Facebook, Twitter, etc.)
  - Visual badges indicating format presets on asset cards

- **Events section** — Add bullet for tenant branding via CSS variables

- **Team section** — Add bullet for email invitations (before user has registered)

- **Settings section** — Add bullet for subscriber identity validation toggle

### 4. Player Guide (`src/pages/PlayerGuide.tsx`)

**Updates:**
- **Challenges section** — Update to reflect task-based work-order model with evidence uploads, per-task checklists, difficulty levels, and evidence review workflow
- **Tournaments section** — Add bullet about multi-date tournaments
- **Media Library section** — Add bullet about Widget Library embeds viewable in pages

### Files Changed

| File | Type of Change |
|------|---------------|
| `src/pages/admin/AdminGuide.tsx` | Update sectionData bullets + permissionRows |
| `src/pages/moderator/ModeratorGuide.tsx` | Update sectionData bullets |
| `src/pages/tenant/TenantGuide.tsx` | Add 2 new sections + update existing bullets |
| `src/pages/PlayerGuide.tsx` | Update sectionData bullets |

All changes are to static string arrays — no logic, routing, or component changes.

