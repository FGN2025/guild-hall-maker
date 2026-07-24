## Goal

Split the current combined "Branded Pages" surface into two clearly separate builders under a new top-level **Branded Assets** hub, while keeping the underlying data model (single `web_pages` table with `is_tenant_banner` flag) unchanged.

## New hierarchy

```text
Settings
  └─ Branded Assets            (sidebar entry, replaces "Branding & Banner")
        ├─ Tenant Banner       (route: /tenant/branding/banner)
        └─ Tenant Landing Pages (route: /tenant/branding/pages)
```

Company Logo, Brand Colors, and Company Info move to a small **Brand Identity** card that appears at the top of the Branded Assets hub (shared context for both builders) — not duplicated inside each sub-builder.

## Pages

1. **`/tenant/branding` — Branded Assets hub**
   - Brand Identity card (Logo, Colors, Company Info) — moved from current TenantBranding.
   - Two large navigation cards: "Tenant Banner" and "Tenant Landing Pages" with short descriptions and current status (banner published Y/N; landing page count).

2. **`/tenant/branding/banner` — Tenant Banner builder**
   - Single-page editor for the one `is_tenant_banner=true` row.
   - Auto-creates the banner row on first visit (existing logic).
   - Reuses `WebPageEditor` but with banner-appropriate copy ("This banner appears above every player portal page") and no slug field visible (slug is internal).
   - No list UI, no "New page" button.

3. **`/tenant/branding/pages` — Tenant Landing Pages**
   - List of non-banner `web_pages` for the tenant with New / Delete / Publish toggle.
   - Clicking a page opens `WebPageEditor` for that page (either inline two-column like today, or a `/tenant/branding/pages/:id` sub-route — will use the existing two-column pattern for minimal churn).
   - Public URL hint: `/pages/<tenant>/<slug>`.

## Component changes

- **`TenantSidebar.tsx`**: Rename the Settings sub-item from "Branding & Banner" to "Branded Assets"; route stays `/tenant/branding`.
- **`src/pages/tenant/TenantBranding.tsx`**: Becomes the hub (Brand Identity + two entry cards). Strip the Branded Pages list/editor block.
- **`src/pages/tenant/TenantBanner.tsx`** (new): Banner-only builder using existing auto-create logic + `WebPageEditor`.
- **`src/pages/tenant/TenantLandingPages.tsx`** (new): Landing-pages list + editor, filtered to `is_tenant_banner != true`.
- **`src/components/branding/BrandedPagesList.tsx`**: Simplified to landing-pages only (drop the "Portal Banner" row) OR replaced by a lighter list component inside `TenantLandingPages`.
- **`src/App.tsx`**: Add two new routes under the tenant guard.

## Not changing

- Database schema, RLS, `useWebPages`, `useUserTenantBranding`, scheduling fields, `WebPageEditor` internals, MCP tools, `TenantBannerSlot` render on the portal.
- Marketing agent prompt — tool names (`propose_portal_banner_update`, `propose_branded_page`) still map cleanly to the two sub-sections.

## Open question

Would you like the **Brand Identity** card (Logo / Colors / Company Info) to live on the Branded Assets hub page, or move to its own "Brand Identity" sub-item alongside Tenant Banner and Tenant Landing Pages (three sub-items instead of two)?
