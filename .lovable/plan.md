

## Per-Tenant Event Publishing with Marketing and Branding

### Overview
Enable tenants (operators and schools) to create, manage, and publish their own private tournaments and events -- complete with branded public-facing event pages accessible via a unique tenant URL (e.g., `/events/tenant-slug`). Each tenant's event page will showcase their branding (logo, colors) and list only their events, giving them a professional, self-contained presence.

### Architecture

```text
+-------------------------------+       +-----------------------------+
| Tenant Portal (/tenant/...)   |       | Public Event Page            |
|  - Create/Edit Events         | ----> | /events/:tenantSlug          |
|  - Upload Hero Images         |       | - Tenant-branded header      |
|  - Attach Marketing Assets    |       | - Logo + brand colors        |
|  - Publish/Unpublish          |       | - Event listings             |
+-------------------------------+       | - Event detail view          |
                                        | - Registration (logged-in)   |
                                        +-----------------------------+
```

### Database Changes

#### 1. New Table: `tenant_events`
Stores events created by tenants, separate from the platform-wide `tournaments` table.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK -> tenants | Owner tenant |
| created_by | uuid | User who created |
| name | text | Event name |
| game | text | Game title |
| description | text | Optional |
| format | text | single_elimination, round_robin, etc. |
| max_participants | integer | Default 16 |
| prize_pool | text | Optional |
| start_date | timestamptz | Required |
| end_date | timestamptz | Optional |
| rules | text | Optional |
| image_url | text | Hero image |
| status | text | draft, published, in_progress, completed, cancelled |
| is_public | boolean | Whether visible on the public event page |
| registration_open | boolean | Whether users can register |
| social_copy | text | Optional social media copy |
| created_at / updated_at | timestamptz | Timestamps |

#### 2. New Table: `tenant_event_registrations`
Tracks user registrations to tenant events.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK -> tenant_events | |
| user_id | uuid | |
| registered_at | timestamptz | |
| status | text | registered, cancelled |

#### 3. New Table: `tenant_event_assets`
Links marketing assets to specific events for promotional use.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK -> tenant_events | |
| asset_url | text | |
| label | text | e.g., "Banner", "Social Post" |
| display_order | integer | |
| created_at | timestamptz | |

#### 4. RLS Policies
- **tenant_events**: Tenant admins/managers can CRUD their own tenant's events; public users can SELECT where `is_public = true` and `status = 'published'`
- **tenant_event_registrations**: Authenticated users can insert/view their own registrations; tenant members can view all registrations for their events
- **tenant_event_assets**: Tenant marketing members can manage; public can view assets for published events

### Frontend Changes

#### 1. Tenant Portal -- Events Management
**New page: `src/pages/tenant/TenantEvents.tsx`**
- List all events for this tenant with status badges
- Create Event dialog (similar to `CreateTournamentDialog` but with tenant-specific fields like `is_public` toggle and marketing asset attachment)
- Edit/Delete events
- Publish/Unpublish toggle
- View registrations per event

**New sidebar entry in `TenantSidebar.tsx`:**
- Add "Events" link with `Calendar` icon, visible to admin and manager roles

#### 2. Public Event Pages (No Auth Required)
**New page: `src/pages/TenantEventPage.tsx`** -- route: `/events/:tenantSlug`
- Fetches tenant branding (logo, colors, name) by slug
- Lists published events for that tenant
- Applies tenant brand colors to the page header and accent elements
- No sidebar -- standalone branded page with a clean layout

**New page: `src/pages/TenantEventDetail.tsx`** -- route: `/events/:tenantSlug/:eventId`
- Event details with hero image, description, rules, schedule
- Registration button (redirects to login if not authenticated)
- Attached marketing assets / promotional images
- Branded with tenant colors

#### 3. Routes (in `App.tsx`)
```text
/events/:tenantSlug              -- Public tenant event listing
/events/:tenantSlug/:eventId     -- Public event detail
/tenant/events                   -- Tenant portal event management (protected)
```

#### 4. New Hooks
- **`useTenantEvents.ts`**: CRUD operations for tenant events, filtered by tenant_id
- **`usePublicTenantEvents.ts`**: Read-only hook for public event pages, fetches by tenant slug

#### 5. Marketing Integration
- When creating/editing an event, tenants can attach assets from their "My Assets" collection
- The Asset Editor (already built) can be used to customize promotional materials for specific events
- Social copy field allows tenants to prepare shareable text for their events

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Migration SQL | Create | `tenant_events`, `tenant_event_registrations`, `tenant_event_assets` tables with RLS |
| `src/hooks/useTenantEvents.ts` | Create | CRUD hook for tenant event management |
| `src/hooks/usePublicTenantEvents.ts` | Create | Read-only hook for public pages |
| `src/pages/tenant/TenantEvents.tsx` | Create | Tenant portal event management page |
| `src/pages/TenantEventPage.tsx` | Create | Public branded event listing page |
| `src/pages/TenantEventDetail.tsx` | Create | Public branded event detail page |
| `src/components/tenant/TenantSidebar.tsx` | Modify | Add "Events" sidebar link |
| `src/App.tsx` | Modify | Add new routes for public and tenant event pages |
| `src/components/tenant/TenantRoute.tsx` | Modify | Include TenantEvents in protected routes |

### Key Design Decisions

- **Separate from platform tournaments**: Tenant events live in their own table to maintain clean data isolation. Platform-wide tournaments remain unchanged.
- **Public pages without auth**: The `/events/:tenantSlug` route is accessible without login, giving tenants a shareable URL for promotion. Registration requires authentication.
- **Tenant branding applied dynamically**: Public event pages fetch the tenant's logo, primary color, and accent color and apply them via CSS variables, matching the existing tenant portal branding pattern.
- **Marketing asset reuse**: Tenants can attach assets from their existing "My Assets" collection to events, leveraging the asset editor for customization.

