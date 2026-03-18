

## Add Sign Out button to Admin Sidebar

The Admin sidebar has no sign out button — it only has "Back to App" links at top and bottom. The main `AppSidebar` has sign out, but the `AdminSidebar` is a separate component used inside `AdminLayout`.

### Fix

**`src/components/admin/AdminSidebar.tsx`**: Add a Sign Out button in the footer area (next to the existing "Back to App" link). Import `LogOut` from lucide-react and use `useAuth()` from `AuthContext` to call `signOut()`, then navigate to `/`.

The footer section will contain both "Back to App" and "Sign Out" buttons stacked vertically.

