

# Web Page Builder — Multi-Section, Dual-Creator, Hosted + Exportable

## Overview
Add a page builder that lets Platform Admins and Tenant staff compose multi-section web pages using assets from the Media Library (tagged "gaming_web_page") and tenant-specific assets (logos, banners, CTAs). Pages are hosted on the platform at public URLs and optionally exportable as standalone HTML.

## New Media Categories
Add these categories to the Media Library so admins can tag assets appropriately:
- `gaming_web_page` — hero images, background textures, gaming-themed graphics
- `cta` — call-to-action button images/graphics  
- `logo` — organization logos (distinct from tenant `logo_url` on the tenants table)

Update CATEGORIES arrays in `MediaUploader`, `MediaGrid`, and `MediaPickerDialog`.

## Database Changes

### 1. `web_pages` table
Stores page metadata and publishing state.

```text
id           uuid PK
tenant_id    uuid (nullable — null for platform-level pages)
title        text
slug         text (unique per tenant)
description  text (nullable)
is_published boolean default false
created_by   uuid
created_at   timestamptz
updated_at   timestamptz
```

RLS: Admins full access; tenant members can manage their own tenant's pages; public SELECT where `is_published = true`.

### 2. `web_page_sections` table
Stores ordered sections that compose a page.

```text
id            uuid PK
page_id       uuid FK -> web_pages
section_type  text ('hero', 'image_gallery', 'text_block', 'cta', 'embed_widget', 'banner', 'video')
display_order integer
config        jsonb (type-specific: heading, subheading, image_url, embed_code, button_text, button_url, items[], background_color, etc.)
created_at    timestamptz
updated_at    timestamptz
```

RLS: inherits from parent page — admins full, tenant members for own tenant, public SELECT on published pages.

### 3. Enable realtime for `web_pages`
So preview updates live while editing.

## Section Types & Config Schema

| Type | Config Keys |
|---|---|
| `hero` | `heading`, `subheading`, `image_url`, `overlay_opacity`, `cta_text`, `cta_url` |
| `text_block` | `heading`, `body` (markdown), `alignment` |
| `image_gallery` | `items[]` (each: `image_url`, `caption`) |
| `cta` | `heading`, `body`, `button_text`, `button_url`, `background_color`, `image_url` |
| `embed_widget` | `embed_code`, `label` |
| `banner` | `image_url`, `link_url`, `alt_text` |
| `video` | `video_url`, `caption` |

## Code Changes

### Phase 2A — Database & Core Hook

| Item | Detail |
|---|---|
| Migration | Create `web_pages` and `web_page_sections` tables with RLS |
| `src/hooks/useWebPages.ts` | CRUD for pages + sections; reorder sections; publish toggle |

### Phase 2B — Admin Page Builder

| Item | Detail |
|---|---|
| `src/pages/admin/AdminWebPages.tsx` | List of pages with create/edit/delete; linked from Admin Marketing or Admin sidebar |
| `src/components/webpages/WebPageEditor.tsx` | Main editor — left panel with section list (drag-to-reorder via dnd-kit), right panel with live preview |
| `src/components/webpages/SectionEditor.tsx` | Config form per section type; includes MediaPickerDialog integration filtered to relevant categories (`gaming_web_page`, `cta`, `banner`, `logo`) |
| `src/components/webpages/SectionPreview.tsx` | Renders a single section as it will appear on the public page |
| `src/components/webpages/AddSectionDialog.tsx` | Pick section type to add |
| Route | `/admin/web-pages` and `/admin/web-pages/:pageId` |

### Phase 2C — Tenant Page Builder

| Item | Detail |
|---|---|
| `src/pages/tenant/TenantWebPages.tsx` | List + create for tenant's own pages |
| `src/pages/tenant/TenantWebPageEditor.tsx` | Same editor component but scoped to tenant; MediaPicker shows tenant assets + gaming_web_page assets |
| Routes | `/tenant/web-pages` and `/tenant/web-pages/:pageId` |
| Sidebar | Add "Web Pages" link to `TenantSidebar` |

### Phase 2D — Public Page & Export

| Item | Detail |
|---|---|
| `src/pages/WebPageView.tsx` | Public renderer at `/pages/:tenantSlug/:pageSlug`; applies tenant branding (logo, colors) |
| Export button in editor | Generates a self-contained HTML file (inline CSS, embedded images as data URIs or absolute URLs) and triggers download |

### Phase 2E — Admin Sidebar & Marketing Integration

| Item | Detail |
|---|---|
| `AdminSidebar.tsx` | Add "Web Pages" nav item under Marketing section |
| `AdminMarketing.tsx` | Add a quick-link card to "Web Pages" |

## Implementation Order
1. **Phase 2A** — Migration + hook (foundation)
2. **Phase 2B** — Admin builder UI (core feature)
3. **Phase 2C** — Tenant builder (extend access)
4. **Phase 2D** — Public view + HTML export
5. **Phase 2E** — Navigation integration

Each phase can be implemented and tested independently. I recommend starting with Phase 2A (database + hook) as the next step.

