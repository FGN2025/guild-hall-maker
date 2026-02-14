

## Admin Panel with Role-Based Access Control

### Overview
Create a dedicated admin area, separate from the main navigation, that is only accessible to users assigned an admin role. A super admin can designate other users as admins. The admin panel will house the Media Library and other management tools, removing them from the regular user navigation.

### What Changes

**1. Role System (Database)**
- Create an `app_role` enum type with values: `admin`, `moderator`, `user`
- Create a `user_roles` table linking users to roles
- Create a `has_role()` security definer function to safely check roles without RLS recursion
- RLS policies: admins can view all roles; users can view their own role; only admins can insert/delete roles
- Seed the first super admin by manually inserting a row (you will provide your user ID)

**2. Admin Layout and Routing**
- Create a new `AdminLayout` component with its own sidebar navigation (separate from the main `Navbar`), styled distinctly so admins know they are in the admin area
- Create an `AdminRoute` wrapper component that checks `has_role(uid, 'admin')` before rendering -- redirects non-admins to the dashboard
- New routes under `/admin/*`:
  - `/admin` -- Admin Dashboard (overview with stats)
  - `/admin/media` -- Media Library (moved here from `/media`)
  - `/admin/users` -- User management (view users, assign/revoke admin role)
  - `/admin/tournaments` -- Tournament oversight

**3. Admin Dashboard Page**
- Overview cards showing total users, total tournaments, total media assets, active seasons
- Quick links to each admin sub-page

**4. User Management Page**
- List all registered users (from `profiles` table)
- Show each user's current role
- Allow admins to promote a user to admin or revoke admin status
- Search/filter users by name or email

**5. Navigation Changes**
- Remove "Media" from the main `Navbar` (it moves to admin area)
- Add an "Admin" link in the main `Navbar` that only appears for users with the admin role
- The admin sidebar will contain: Dashboard, Media, Users, Tournaments

**6. Auth Context Enhancement**
- Add a `role` field and `isAdmin` boolean to the `AuthContext`
- Query `user_roles` on auth state change to determine the user's role
- Expose `isAdmin` for conditional rendering (e.g., showing the Admin link in the navbar)

### Technical Details

**Database migration:**
```text
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

After migration, you will need to insert your own user ID as the first super admin using the Cloud SQL runner.

**Files to create:**

| File | Purpose |
|------|---------|
| `src/components/admin/AdminLayout.tsx` | Admin shell with sidebar nav, header, and content area |
| `src/components/admin/AdminRoute.tsx` | Protected route wrapper that checks admin role |
| `src/components/admin/AdminSidebar.tsx` | Sidebar navigation for admin pages |
| `src/pages/admin/AdminDashboard.tsx` | Admin overview with stats cards |
| `src/pages/admin/AdminMedia.tsx` | Media Library (reuses existing media components) |
| `src/pages/admin/AdminUsers.tsx` | User list with role management |
| `src/pages/admin/AdminTournaments.tsx` | Tournament oversight page |
| `src/hooks/useUserRole.ts` | Hook to query current user's role from `user_roles` |
| `src/hooks/useAdminUsers.ts` | Hook for listing users and managing roles |

**Files to modify:**

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `isAdmin` boolean, query `user_roles` on auth change |
| `src/components/Navbar.tsx` | Remove "Media" link; add conditional "Admin" link for admins |
| `src/App.tsx` | Remove `/media` route from main routes; add `/admin/*` routes |

**Admin sidebar navigation items:**
- Dashboard (LayoutDashboard icon) -> `/admin`
- Media Library (Image icon) -> `/admin/media`
- Users (Users icon) -> `/admin/users`
- Tournaments (Trophy icon) -> `/admin/tournaments`

**AdminRoute component logic:**
1. Check `isAdmin` from AuthContext
2. If loading, show spinner
3. If not authenticated, redirect to `/auth`
4. If authenticated but not admin, redirect to `/dashboard` with a toast message
5. If admin, render children wrapped in `AdminLayout`

