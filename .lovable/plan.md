## Consolidate Settings into a tabbed page

Collapse the current two sidebar entries (**Settings** + **Branded Assets**) into a single **Settings** entry that hosts everything as tabs.

### New structure

Sidebar: one `Settings` item → `/tenant/settings`.

`TenantSettings.tsx` becomes a tabbed shell with two tabs (URL-synced via `?tab=`):

1. **Brand Guide** (default, renamed from "Branded Assets")
   - Company Logo card
   - Brand Colors card
   - Company Info card
   - Keeps the "Looking for your banner or landing pages? → Marketing → Web Pages" pointer callout
2. **Platform** (or "Integrations" — see question below)
   - Cloud Gaming toggle card (`CloudGamingConfigCard`)
   - Cloud Gaming Seats card (conditional on enabled)

### Files touched

- `src/components/tenant/TenantSidebar.tsx` — remove the `Branded Assets` item; keep only `Settings`.
- `src/pages/tenant/TenantSettings.tsx` — rewrite as a `Tabs` shell with the two tabs, driven by `?tab=brand|platform`. Import the three brand cards inline (extract from `TenantBranding.tsx`) or render `<TenantBranding embedded />` inside the Brand Guide tab.
- `src/pages/tenant/TenantBranding.tsx` — add an `embedded` prop that hides the outer `h1/description` so it can be dropped into the tab. Update page heading text from "Branded Assets" → "Brand Guide" when standalone.
- `src/App.tsx` — keep `/tenant/branding` as a redirect to `/tenant/settings?tab=brand` (back-compat for the pointer link and any bookmarks). The Marketing pointer callout link in the Brand Guide tab stays as-is.

### Not changing

- Marketing → Web Pages (Banner + Landing Pages) stays exactly where it is.
- Account page (`/tenant/account`) with billing stays separate — it's a distinct concern per the earlier reorg.
- No schema/API/RLS changes.

### One open question

The second tab holds Cloud Gaming today but may grow (integrations, etc.). Should it be labeled **Platform**, **Integrations**, or **General**?
