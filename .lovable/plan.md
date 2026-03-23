

## Remove Grey Header Bar from Dashboard

The grey bar at the top of the dashboard content area is the global app header (containing only the `SidebarTrigger`) rendered by `AppLayout.tsx`. Currently only `/tournaments` suppresses it.

### Change

**`src/components/AppLayout.tsx`** — Add `"/dashboard"` to `HEADERLESS_ROUTES`:

```typescript
const HEADERLESS_ROUTES = ["/tournaments", "/dashboard"];
```

This will hide the empty grey header bar on the dashboard page. The sidebar remains fully accessible via its toggle, so no functionality is lost.

