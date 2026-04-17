

The user wants the FGN Ecosystem section (Play/Manage/Hub buttons) removed from sidebars for Platform Admins, and a full impact assessment before removal.

## Impact Assessment

**Files referencing `useEcosystemAuth` / ecosystem magic links:**
- `src/components/tenant/TenantSidebar.tsx` — renders Play/Manage/Hub buttons
- `src/hooks/useEcosystemAuth.ts` — hook calling `ecosystem-magic-link` edge function
- `src/pages/admin/AdminEcosystem.tsx` — admin page for ecosystem config (separate, not in scope)

**Backend dependencies (KEEP — not in scope):**
- `supabase/functions/ecosystem-magic-link/index.ts` — still needed for inbound cross-app links
- `supabase/functions/validate-ecosystem-token/index.ts` — token validation endpoint
- `supabase/functions/ecosystem-data-api/index.ts` — data API for spoke apps
- `supabase/functions/ecosystem-webhook-dispatch/index.ts` — webhook dispatcher
- `supabase/functions/ecosystem-calendar-feed/index.ts` — calendar feed
- `/admin/ecosystem` page and underlying `ecosystem_*` tables

**Verdict:** Removing the sidebar buttons is safe. The hook `useEcosystemAuth` is only consumed by `TenantSidebar.tsx`, so it can be deleted too. All edge functions and the AdminEcosystem page remain functional and untouched.

## Changes

### 1. `src/components/tenant/TenantSidebar.tsx`
- Remove the `ecosystemApps` array
- Remove the `useEcosystemAuth()` hook call
- Remove the entire "FGN Ecosystem" nav section (header label + buttons map)
- Clean up unused imports: `ExternalLink`, `Loader2`, `useEcosystemAuth`

### 2. `src/hooks/useEcosystemAuth.ts`
- Delete the file (no remaining consumers after sidebar cleanup)

### 3. Verify no other sidebars reference it
- `AdminSidebar.tsx`, `ModeratorSidebar.tsx`, `MarketingSidebar.tsx` — confirmed none use `useEcosystemAuth` based on prior search

## Out of Scope (Preserved)
- `/admin/ecosystem` admin configuration page
- All `ecosystem-*` edge functions (inbound cross-app integration still works)
- Database tables: `ecosystem_webhooks`, `ecosystem_sync_log`, ecosystem tokens

## Test
1. As Platform Admin on `/tenant/settings` → no "FGN Ecosystem" header or Play/Manage/Hub buttons
2. As Tenant Admin on any `/tenant/*` page → same; no buttons
3. `/admin/ecosystem` still loads and functions normally
4. No console errors; no broken imports
5. Inbound magic links from other apps still authenticate users (edge function untouched)

