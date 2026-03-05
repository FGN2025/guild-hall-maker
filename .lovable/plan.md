

# Embeddable Tournament Calendar -- Assessment & Plan

## Level of Effort: **Medium**

This requires a new database table, a public (unauthenticated) route, calendar configuration UI for admins/tenants, and an embed code generator. Roughly 6-8 files changed/created.

## What to Build

A standalone, publicly accessible calendar page at `/embed/calendar/:configId` that renders tournament data with optional branding (background image, logo, colors). Admins can publish a platform-wide calendar; tenant marketers can publish tenant-branded calendars showing their tenant events. Each published calendar gets a configuration record and a copyable embed snippet (`<iframe src="..."/>`).

## Architecture

```text
┌─────────────────────────────┐
│  calendar_publish_configs   │  ← new table
│  id, tenant_id (nullable),  │
│  logo_url, bg_image_url,    │
│  primary_color, accent_color│
│  title, is_active, show_platform_tournaments,
│  created_by, created_at     │
└──────────────┬──────────────┘
               │
   ┌───────────┴───────────┐
   │ /embed/calendar/:id   │  ← public route, no auth required
   │ Renders calendar with │
   │ branding from config  │
   └───────────────────────┘
```

## Implementation

### 1. Database: `calendar_publish_configs` table + RLS

```sql
CREATE TABLE public.calendar_publish_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Tournament Calendar',
  logo_url text,
  bg_image_url text,
  primary_color text DEFAULT '#6366f1',
  accent_color text,
  show_platform_tournaments boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_publish_configs ENABLE ROW LEVEL SECURITY;

-- Public can read active configs (needed for embed page)
CREATE POLICY "Anyone can view active configs"
  ON public.calendar_publish_configs FOR SELECT
  USING (is_active = true);

-- Admins can manage all
CREATE POLICY "Admins can manage calendar configs"
  ON public.calendar_publish_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Tenant marketing members can manage their own
CREATE POLICY "Tenant marketing can manage own configs"
  ON public.calendar_publish_configs FOR ALL TO authenticated
  USING (is_tenant_marketing_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));
```

### 2. Public Embed Page: `src/pages/EmbedCalendar.tsx`

- Route: `/embed/calendar/:configId` (no `AppLayout`, no navbar, no auth)
- Fetches `calendar_publish_configs` by ID (public SELECT)
- If `tenant_id` is set: fetches published tenant events for that tenant
- If `show_platform_tournaments` is true: fetches public tournaments
- Renders a self-contained calendar grid with:
  - Logo overlay (top-left) from `logo_url`
  - Background image from `bg_image_url` with overlay
  - Brand colors applied via inline CSS variables
  - Month navigation, event chips
- Designed to look good inside an `<iframe>` (no scrollbars on single month view)

### 3. Hook: `src/hooks/useCalendarPublish.ts`

- CRUD for `calendar_publish_configs`
- Query configs by tenant or platform-wide (tenant_id IS NULL)
- Mutation for create, update, delete

### 4. Admin UI: Add "Publish Calendar" section

- In Admin Settings or as a tab on the existing calendar page
- Form fields: Title, Logo (media picker), Background Image (media picker), Primary Color, Accent Color
- Toggle: Include platform tournaments
- Once saved: shows copyable embed snippet `<iframe src="https://guild-hall-maker.lovable.app/embed/calendar/{id}" width="100%" height="600" frameborder="0"></iframe>`

### 5. Tenant UI: Add "Publish Calendar" to Tenant Marketing or Settings

- Same form but scoped to tenant_id
- Shows only tenant events by default
- Logo and colors default from tenant branding but can be overridden

### 6. Routing (`App.tsx`)

- Add `/embed/calendar/:configId` route **outside** AppLayout (bare page)

## Files Changed

| File | Action |
|---|---|
| Migration SQL | Create `calendar_publish_configs` table + RLS |
| `src/pages/EmbedCalendar.tsx` | Create -- public embeddable calendar |
| `src/hooks/useCalendarPublish.ts` | Create -- CRUD hook |
| `src/components/admin/CalendarPublishManager.tsx` | Create -- admin config UI |
| `src/components/tenant/CalendarPublishManager.tsx` | Create -- tenant config UI (reuses admin component with tenant scope) |
| `src/pages/admin/AdminSettings.tsx` | Update -- add calendar publish section |
| `src/pages/tenant/TenantMarketing.tsx` or `TenantSettings.tsx` | Update -- add calendar publish section |
| `src/App.tsx` | Add embed route outside layout |

## What Does NOT Change
- Existing tournament calendar page for logged-in users
- Tournament or tenant_events schemas
- Existing RLS policies

