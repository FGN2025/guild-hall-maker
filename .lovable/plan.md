

# Fix: Remove stale Coach reference and redirect /coach

## Problem
The `/coach` route was removed in favor of a floating AI Coach button, but:
1. The browser is running a stale bundle that still references an undefined `Coach` component (runtime error at line 333)
2. Users navigating to `/coach` get a 404 page

## Solution

### 1. Add a redirect from `/coach` to `/dashboard`
In `src/App.tsx`, add a redirect route so anyone hitting `/coach` (e.g., from a bookmark) gets sent to `/dashboard` where the floating coach button is available.

```tsx
import { Navigate } from "react-router-dom";
// Add inside <Routes>:
<Route path="/coach" element={<Navigate to="/dashboard" replace />} />
```

### 2. Verify no stale Coach import
The current `App.tsx` on disk is clean (no `Coach` import). The runtime error is from a cached build. The redirect will resolve the navigation issue, and the next build will clear the stale reference.

## Files to modify
- `src/App.tsx` -- add one redirect route for `/coach` to `/dashboard`

