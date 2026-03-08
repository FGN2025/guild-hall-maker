

## Auto-Apply Tenant Branding to New Assets

### Problem
When tenant staff create new Calendars, Web Pages, or promotional assets, they start from scratch with default/generic colors. The tenant's logo and brand colors (stored in the `tenants` table) should be pre-populated automatically so marketers get a branded starting point without manual entry.

### Where Tenant Branding Lives
- `tenants` table: `logo_url`, `primary_color`, `accent_color`
- `useTenantAdmin()` hook already exposes `tenantInfo.logoUrl`, `tenantInfo.primaryColor`, `tenantInfo.accentColor`

### Changes

#### 1. `CalendarPublishManager.tsx` — Pre-fill new calendar with tenant branding
The `startNew()` function (line 34) currently hardcodes `primary_color: "#6366f1"`, `logo_url: null`, `accent_color: ""`. When a `tenantId` is provided, look up tenant branding from the parent context and use it as defaults:

- Accept new props: `tenantLogoUrl`, `tenantPrimaryColor`, `tenantAccentColor`
- In `startNew()`, default `logo_url` to `tenantLogoUrl`, `primary_color` to `tenantPrimaryColor || "#6366f1"`, and `accent_color` to `tenantAccentColor || ""`

#### 2. `TenantMarketing.tsx` — Pass tenant branding down to CalendarPublishManager
- Import `useTenantAdmin` (already available in scope via TenantRoute)
- Pass `tenantInfo.logoUrl`, `tenantInfo.primaryColor`, `tenantInfo.accentColor` as props to `CalendarPublishManager`

#### 3. `TenantPromoPickerDialog.tsx` / `EventPromoEditor.tsx` — Use tenant accent color in promo text overlays
- Accept optional `tenantPrimaryColor` prop
- In `buildTenantEventPromo` and `buildTournamentPromo`, use the tenant's primary color for the prize/accent text instead of hardcoded `#ffd700`, and use it as the default text color accent
- These remain editable in the Asset Editor

#### 4. `WebPageEditor.tsx` / `SectionEditor.tsx` — Pre-fill hero and CTA sections with tenant colors
- When a new section is added via `addSection`, if the section type is `hero` or `cta`, set default config values using tenant branding:
  - `hero`: `button_color` = tenant primary color, `button_text_color` = white
  - `cta`: `bg_color` = tenant primary color, `button_color` = tenant accent color
- Pass `tenantInfo` through from the parent page to `WebPageEditor` → `addSection` default configs

#### 5. `TenantMarketingAssets.tsx` — No structural change needed
- Asset uploads are raw files; branding applies when they go through the Asset Editor
- The Asset Editor already supports `initialTexts` — no change needed here since the promo builders (step 3) handle the color injection

### Summary of prop flow
```text
useTenantAdmin() → tenantInfo.{logoUrl, primaryColor, accentColor}
  ├─→ CalendarPublishManager (startNew defaults)
  ├─→ TenantPromoPickerDialog (promo text colors)
  └─→ WebPageEditor → addSection (hero/cta default configs)
```

All values remain fully editable after being pre-populated.

