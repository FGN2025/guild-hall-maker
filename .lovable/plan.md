

## Multi-Tenant Marketing Library

### Concept
Build a marketing asset library (similar to Harper) where admins create master marketing campaigns with assets (social media posts, flyers, banners), and each tenant can browse and download versions automatically adapted with their own logo and brand colors.

### How It Works

1. **Admins create "Marketing Campaigns"** -- each campaign has a title, description, suggested social copy, category (social media, print, email, event), and one or more asset variants (square, vertical, horizontal).

2. **Asset variants are uploaded as master images** to the `app-media` storage bucket. Each variant stores dimensions and format metadata.

3. **Tenants browse the Marketing Library** from a new `/tenant/marketing` page. They see all published campaigns in a grid (like Harper's product listing). Clicking a campaign shows the detail view with copy, preview images, and a download button.

4. **Tenant-branded downloads** -- when a tenant downloads an asset, the system overlays their logo onto a designated region of the master image using a backend function. This is the simplest approach that works without Canva API integration. For a Phase 2, we can add full Canva Autofill API integration for richer template customization.

### Database Schema

**`marketing_campaigns`** table:
- `id` (uuid, PK)
- `title` (text)
- `description` (text, nullable)
- `social_copy` (text, nullable) -- suggested post text
- `category` (text, default 'social_media') -- social_media, print, email, event
- `is_published` (boolean, default false)
- `created_by` (uuid)
- `created_at`, `updated_at` (timestamps)

**`marketing_assets`** table:
- `id` (uuid, PK)
- `campaign_id` (uuid, FK to marketing_campaigns)
- `label` (text) -- e.g. "Square", "Vertical", "Horizontal"
- `file_path` (text) -- storage path in app-media
- `url` (text) -- public URL of master asset
- `width` (int, nullable)
- `height` (int, nullable)
- `display_order` (int, default 0)
- `created_at` (timestamp)

RLS: Admins can manage both tables. Published campaigns are readable by tenant members. Assets inherit campaign visibility.

### Routes and Pages

| Route | Component | Access |
|-------|-----------|--------|
| `/admin/marketing` | AdminMarketing | Admin only |
| `/tenant/marketing` | TenantMarketing | Tenant admins/managers |
| `/tenant/marketing/:id` | TenantMarketingDetail | Tenant admins/managers |

### UI Components

**Admin side (`/admin/marketing`)**:
- Campaign list with create/edit/delete/publish toggle
- Campaign editor dialog: title, description, social copy, category picker
- Asset uploader per campaign (drag-drop, multiple variants)
- Publish/unpublish toggle

**Tenant side (`/tenant/marketing`)**:
- Grid of published campaigns with cover thumbnails and category badges
- Search and category filter tabs
- Campaign detail page showing all asset variants with previews, the social copy (with a copy-to-clipboard button), and download buttons
- Each download provides the master image directly (Phase 1) with tenant logo watermark overlay (Phase 2)

### Implementation Steps

1. **Database migration** -- create `marketing_campaigns` and `marketing_assets` tables with RLS policies
2. **Hook: `useMarketingCampaigns`** -- CRUD for campaigns and assets (admin), read-only listing (tenant)
3. **Admin page and components** -- campaign management UI at `/admin/marketing`, add sidebar link
4. **Tenant page and components** -- browsing UI at `/tenant/marketing` and `/tenant/marketing/:id`, add sidebar link
5. **Wire up routes** in `App.tsx`

### Phase 2 (Future)
- Canva Autofill API integration for dynamic template rendering with tenant brand kits
- Auto-generate tenant-specific versions with logo/color swaps via edge function
- Asset usage analytics per tenant

