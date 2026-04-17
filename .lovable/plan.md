

The `/tenant/branding` route is missing from the router. The page component exists (`src/pages/tenant/TenantBranding.tsx`) and the sidebar likely links to it, but no `<Route>` was registered in `App.tsx`.

## Fix

Register the route in `src/App.tsx` alongside the other tenant routes:

```tsx
<Route path="/tenant/branding" element={
  <TenantRoute><TenantBranding /></TenantRoute>
} />
```

Add the import:
```tsx
import TenantBranding from "./pages/tenant/TenantBranding";
```

## Verify sidebar link
Confirm `TenantSidebar.tsx` already has a "Branding & Banner" entry pointing to `/tenant/branding`. If missing, add it with the `Palette` icon.

## Test
1. Navigate to `/tenant/branding` → page loads (no 404)
2. Banner page auto-creates on first visit
3. Add a section, save, switch to Preview tab → renders
4. Confirm banner shows above outlet on `/dashboard` for tenant staff/subscribers

