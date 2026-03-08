

## Next Phase: Route-Level Code Splitting (Lazy Loading)

### Why This Is #1 Priority

The entire application — all 50+ page components, 30+ admin/moderator/tenant pages, and their dependencies — is loaded in a **single JavaScript bundle** on initial page load. There is zero code splitting. This means:

- A player visiting the landing page downloads all admin, moderator, tenant, and marketing code
- Every page import in `App.tsx` (80+ imports) is eagerly loaded
- Initial load time scales with total app size, not the page being visited

This is the single highest-impact performance improvement available. For a platform this size, lazy loading typically reduces initial bundle size by 60-80%.

### What Changes

**`src/App.tsx`** — Convert all 50+ page imports from eager to lazy:

```tsx
// Before (current — all loaded immediately):
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMedia from "./pages/admin/AdminMedia";
// ... 50+ more

// After (loaded on demand):
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
// ... 50+ more
```

Wrap the `<Routes>` block in a `<Suspense>` with a loading spinner fallback.

**Keep eagerly loaded:** `Index` (landing page), `Auth` (login), `ProtectedRoute`, `AppLayout` — these are entry points that should load immediately.

### Secondary: Query Cache Configuration

Currently only 2 of ~30 hooks set `staleTime`. All others use React Query defaults (0ms stale time), causing redundant refetches on every component mount and tab focus. Add a global default to the `QueryClient`:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute before data is considered stale
      gcTime: 5 * 60_000,       // 5 minutes garbage collection
      refetchOnWindowFocus: false,
    },
  },
});
```

### Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Convert ~50 imports to `React.lazy()`, add `Suspense` wrapper |
| `src/App.tsx` | Configure `QueryClient` with default staleTime/gcTime |

### Impact

- **Initial load**: 60-80% smaller JS bundle for first paint
- **Navigation**: Admin/moderator/tenant code only downloaded when those routes are visited
- **Data fetching**: Eliminates redundant API calls on tab focus and re-mounts

Two changes, one file, largest possible performance gain for the effort.

