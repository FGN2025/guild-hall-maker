

## Phase 1: Consolidate Marketing Sidebar into Tabbed View

### Problem
The tenant sidebar has 4 separate entries for marketing-related features (Marketing, My Assets, Codes, Web Pages), forcing marketing users to navigate between disconnected pages for related tasks.

### Changes

#### 1. `src/components/tenant/TenantSidebar.tsx`
Remove three sidebar entries, keeping only "Marketing":
- Remove `{ to: "/tenant/marketing/assets", label: "My Assets", ... }`
- Remove `{ to: "/tenant/codes", label: "Codes", ... }`
- Remove `{ to: "/tenant/web-pages", label: "Web Pages", ... }`

#### 2. `src/pages/tenant/TenantMarketing.tsx`
Replace the current campaigns-only view with a top-level `Tabs` component containing 4 tabs:
- **Campaigns** — existing campaign grid + category filters + search + CalendarPublishManager
- **My Assets** — embed `TenantMarketingAssets` component
- **Codes** — embed `TenantCodes` component
- **Web Pages** — embed `TenantWebPages` component

The page header ("Marketing Library") stays above the tabs. Each tab renders the existing page component directly, keeping all current functionality intact. The inner category filter tabs (for campaigns) become a nested filter within the Campaigns tab.

#### 3. `src/App.tsx`
Remove (or redirect) the standalone routes:
- `/tenant/marketing/assets` → remove route
- `/tenant/codes` → remove route  
- `/tenant/web-pages` → remove route

Keep `/tenant/marketing/:id` route for campaign detail navigation.

#### 4. Sub-component adjustments
Each embedded page component (`TenantMarketingAssets`, `TenantCodes`, `TenantWebPages`) currently renders its own page-level heading. Strip the outer heading/description from each when used inside the tabbed view — either by adding a `embedded` prop or by extracting the content into a reusable inner component. The simplest approach: remove the top-level `<h1>` and description from each since the parent tab label provides sufficient context.

