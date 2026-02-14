
# Sidebar Navigation Migration Plan

## Overview
Replace the current top `Navbar` across all authenticated pages with a unified sidebar using the existing shadcn `Sidebar` component. The landing page (`/`) and auth page (`/auth`) will keep their current layout (no sidebar). Admin and Provider sections will also retain their existing dedicated sidebars.

## What Changes

### Pages getting the new sidebar (11 pages)
Tournaments, Dashboard, Community, Leaderboard, SeasonStats, PlayerComparison, Achievements, PlayerProfile, ProfileSettings, TournamentBracket, TournamentManage, MediaLibrary

### Pages staying as-is
- `/` (Index) -- landing page keeps top Navbar
- `/auth` -- login/signup, no nav needed
- `/admin/*` -- already has AdminLayout with sidebar
- `/provider/*` -- already has ProviderLayout with sidebar

---

## Implementation Steps

### Step 1: Create `AppSidebar` component
**New file:** `src/components/AppSidebar.tsx`

- Uses shadcn `Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, etc.
- Contains all 7 main nav items (Tournaments, Dashboard, Community, Leaderboard, Stats, Compare, Badges)
- Conditionally shows Admin and Provider links based on `isAdmin` / `isTenantAdmin`
- Header section with FGN logo/branding
- Footer section with Profile and Sign Out actions
- Supports icon-only collapsed state via `collapsible="icon"`
- Uses `NavLink` for active-route highlighting

### Step 2: Create `AppLayout` wrapper component
**New file:** `src/components/AppLayout.tsx`

- Wraps content in `SidebarProvider` + `AppSidebar` + main content area
- Includes a small header bar with `SidebarTrigger` (always visible for toggling)
- Replaces the need for `<Navbar />` on each page

### Step 3: Apply layout at the route level in `App.tsx`
Instead of editing all 11 page files individually, wrap the authenticated routes in `AppLayout`:

```text
Before:
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

After:
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/tournaments" element={<Tournaments />} />
    ...all other authenticated routes
  </Route>
```

`AppLayout` will use `<Outlet />` from react-router-dom to render child routes.

### Step 4: Remove `<Navbar />` from all 11 page components
Each page currently imports and renders `<Navbar />` at the top along with a `pt-24` padding class (to offset the fixed navbar). Both will be removed since the sidebar layout handles navigation.

**Files modified:** Dashboard, Tournaments, Community, Leaderboard, SeasonStats, PlayerComparison, Achievements, PlayerProfile, ProfileSettings, TournamentBracket, TournamentManage (and MediaLibrary if used)

### Step 5: Keep `Navbar.tsx` for the landing page
The existing `Navbar` component stays -- it is only used by `Index.tsx` (the landing/marketing page).

---

## Technical Details

### AppSidebar structure
```text
+---------------------------+
| [Gamepad2 icon] FGN       |  <-- SidebarHeader
+---------------------------+
| MAIN                      |  <-- SidebarGroupLabel
|  > Tournaments            |
|  > Dashboard              |
|  > Community              |
|  > Leaderboard            |
|  > Stats                  |
|  > Compare                |
|  > Badges                 |
+---------------------------+
| ADMIN (if admin)          |  <-- conditional group
|  > Admin Panel            |
+---------------------------+
| PROVIDER (if tenant admin)|  <-- conditional group
|  > Provider Panel         |
+---------------------------+
| [Settings] Profile        |  <-- SidebarFooter
| [LogOut]   Sign Out       |
+---------------------------+
```

### Mobile behavior
- On mobile (less than 768px), the shadcn Sidebar automatically renders as a slide-out `Sheet`
- `SidebarTrigger` in the top header bar opens/closes it
- No extra mobile menu code needed -- the component handles it

### Route structure in App.tsx
```text
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />

  {/* Authenticated routes with sidebar */}
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/tournaments" element={<Tournaments />} />
    <Route path="/tournaments/:id/bracket" element={<TournamentBracket />} />
    <Route path="/tournaments/:id/manage" element={<TournamentManage />} />
    <Route path="/community" element={<Community />} />
    <Route path="/leaderboard" element={<Leaderboard />} />
    <Route path="/season-stats" element={<SeasonStats />} />
    <Route path="/compare" element={<PlayerComparison />} />
    <Route path="/achievements" element={<Achievements />} />
    <Route path="/player/:id" element={<PlayerProfile />} />
    <Route path="/profile" element={<ProfileSettings />} />
  </Route>

  {/* Admin routes (keep existing AdminRoute wrapper) */}
  <Route path="/admin" element={<AdminRoute>...</AdminRoute>} />
  ...

  {/* Provider routes (keep existing ProviderRoute wrapper) */}
  <Route path="/provider" element={<ProviderRoute>...</ProviderRoute>} />
  ...

  <Route path="*" element={<NotFound />} />
</Routes>
```

### Files created (2)
- `src/components/AppSidebar.tsx`
- `src/components/AppLayout.tsx`

### Files modified (13)
- `src/App.tsx` -- restructure routes with layout route
- `src/components/ProtectedRoute.tsx` -- ensure it supports `<Outlet />` when no children passed
- 11 page files -- remove `<Navbar />` import and `pt-24` top padding

### Estimated effort
2 messages to implement and verify.
