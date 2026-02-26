

## Add Marketing Link to Main App Sidebar

### Problem
The main application sidebar (`AppSidebar.tsx`) has no "Marketing" entry. Users with the Super Admin or Marketing role can only reach marketing pages by first navigating into the Admin Panel or Tenant Panel, which is not discoverable.

### Solution
Add a new sidebar group for "Marketing" that appears for users with either the `isAdmin` or `isMarketing` flag.

### Changes

#### `src/components/AppSidebar.tsx`

1. Import `Megaphone` icon from lucide-react
2. Destructure `isMarketing` from `useAuth()`
3. Add a new `SidebarGroup` (between Moderator and Tenant sections) that renders when `isAdmin || isMarketing`:
   - Links to `/admin/marketing` for Super Admins (they manage campaigns from the admin area)
   - The label will be "Marketing" with a `Megaphone` icon

This follows the existing pattern used by Admin Panel, Moderator Panel, and Tenant Panel sidebar groups.

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add Marketing sidebar group visible to admin and marketing roles |

