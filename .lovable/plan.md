## Goal

Eliminate the three overlapping surfaces for banner + landing pages. One home for authoring (Marketing), one home for brand theme (Branded Assets).

## Current problems

1. **"Web Pages" appears twice in the sidebar** — as a top-level item AND as a Marketing tab, both pointing to the same route.
2. **Marketing → Web Pages tab is read-only** — dead-end that forces navigation to Branded Assets to actually edit.
3. **Banner and Landing Pages sit under Branded Assets** even though they are marketing artifacts, not brand identity.

## Target structure

**Sidebar (tenant)**
```text
Dashboard
Players
Leads
Events
ZIP Codes
Subscribers
Integrations
Marketing            ← single home for all page authoring
Team
Codes
Settings
  └ Branded Assets   ← brand identity ONLY (logo, colors, company info)
Account
Guide
```

**Marketing tabs**
```text
Campaigns | My Assets | Universal Assets | Codes | Web Pages | Social Accounts | Scheduled | Agent Drafts
```

The **Web Pages** tab becomes the full authoring surface with two sub-tabs:
```text
[ Banner ]  [ Landing Pages ]
```

- **Banner sub-tab** — single-row editor for the `is_tenant_banner=true` row. Same UI currently at `/tenant/branding/banner` (Hero + CTA only, auto-init on first visit, video sections auto-purged).
- **Landing Pages sub-tab** — list-plus-editor layout currently at `/tenant/branding/pages`. Left rail lists pages with New/Delete; right pane shows full `WebPageEditor` inline with scheduling, section picker, publish toggle, export.

## Changes

### Sidebar (`src/components/tenant/TenantSidebar.tsx`)
- Remove the top-level **Web Pages** item.
- Remove the **Branded Assets → Tenant Banner** and **Tenant Landing Pages** nested items.
- Keep **Settings → Branded Assets** as the sole nested item (brand identity hub).

### Marketing page (`src/pages/tenant/TenantMarketing.tsx`)
- Replace the read-only card list inside the **Web Pages** tab with a new `<WebPagesTab />` that renders two internal sub-tabs (shadcn `Tabs`): Banner | Landing Pages.
- Sub-tab state persists in URL as `?tab=webpages&sub=banner|pages` so agents/deep links still work.

### New component: `src/components/tenant/marketing/WebPagesTab.tsx`
- Wraps the existing `TenantBanner` body (banner sub-tab) and `TenantLandingPages` body (landing sub-tab).
- Extract the current page bodies into reusable components (`BannerBuilder`, `LandingPagesBuilder`) so both the tab and any legacy route render the same thing.

### Branded Assets hub (`src/pages/tenant/TenantBranding.tsx`)
- Remove the two navigation cards ("Configure Banner", "Manage Landing Pages").
- Keep only Company Logo, Brand Colors, Company Info.
- Add a small info banner: "Looking for your banner or landing pages? They live under Marketing → Web Pages."

### Routes (`src/App.tsx`)
- Keep `/tenant/branding/banner` and `/tenant/branding/pages` as **redirects** to `/tenant/marketing?tab=webpages&sub=banner|pages` so existing bookmarks, agent-generated links, and MCP tool link outputs don't 404.

### MCP tools (`supabase/functions/_shared/mcp-tools/`)
- Update any tool descriptions or link outputs (e.g. `list_branded_pages`, `propose_branded_page`, `propose_portal_banner_update`) that reference `/tenant/branding/...` to point at the new Marketing URLs. Behavior unchanged, just link text.

### No DB changes
The `web_pages` table, `is_tenant_banner` flag, RLS policies, and triggers stay exactly as they are. This is pure UI consolidation.

## Verification

1. Sidebar shows no duplicate "Web Pages" and no Branded Assets sub-items.
2. Marketing → Web Pages → Banner opens the full banner editor inline; edits save; scheduling works.
3. Marketing → Web Pages → Landing Pages lists pages, New/Delete work, selecting a page opens the full editor inline.
4. Visiting `/tenant/branding/banner` and `/tenant/branding/pages` redirects to the new tab URLs.
5. Branded Assets page shows only brand identity + the pointer message.
6. MCP `list_branded_pages` still returns correct data; any embedded links point to `/tenant/marketing?tab=webpages&sub=...`.
