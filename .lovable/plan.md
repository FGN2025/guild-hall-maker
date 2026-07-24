## Goal

Consolidate all tenant brand assets on the **Branding & Banner** page, and reach it via **Settings** instead of a top-level sidebar item.

## Changes

### 1. `src/pages/tenant/TenantBranding.tsx`
Add three cards above the existing "Subscriber Banner" editor card, in this order:
- **Company Logo** — logo preview + upload button
- **Brand Colors** — primary + accent color pickers with Save
- **Company Info** — read-only Company Name + editable Contact Email

Port the state, handlers (`handleLogoUpload`, `handleSaveEmail`, `handleSaveColors`), and imports (`resizeImageFile`, `ColorPicker`, storage upload, query invalidations) verbatim from `TenantSettings.tsx`. Update the page subtitle to reflect that both brand assets and the subscriber banner live here. Remove the now-redundant "Manage your logo and brand colors in Tenant Settings" link at the top.

### 2. `src/pages/tenant/TenantSettings.tsx`
- Remove the Company Logo, Brand Colors, and Company Info cards and all supporting state/handlers/imports that only served them.
- Keep `CloudGamingConfigCard` and the conditional `CloudGamingSeatsCard`.
- Update the header subtitle (e.g. "Cloud gaming and platform integrations. For logo, colors, and company info, visit **Branding & Banner**.") with a link to `/tenant/branding`.

### 3. `src/components/tenant/TenantSidebar.tsx`
- Remove the standalone "Branding & Banner" nav item.
- Add it as a sub-item under "Settings" (or, if the sidebar has no sub-nav pattern, keep the route but surface access via a prominent link/tile inside the Settings page and a small "Branding & Banner" entry immediately under Settings in the sidebar list).

Route `/tenant/branding` in `App.tsx` stays unchanged — no routing changes needed.

### 4. `TenantAccount` untouched
Billing already lives at `/tenant/account` from the previous change; no work there.

## Out of scope
- No DB, RLS, or edge function changes.
- No changes to `useUserTenantBranding`, `TenantBrandingContext`, or the banner rendering pipeline.
- No visual redesign of the moved cards — same shadcn `Card` structure, same tokens.

## Verification
- `/tenant/settings` renders only Cloud Gaming cards + link to Branding.
- `/tenant/branding` shows Logo, Colors, Company Info, then the Subscriber Banner editor.
- Logo upload, color save, and email save still update `tenants` and invalidate the same react-query keys as before (branding context refreshes).
- Sidebar no longer has a top-level "Branding & Banner" entry; it is reachable via Settings.
