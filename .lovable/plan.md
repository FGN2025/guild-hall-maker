

# Fix FGN Logo Link in Sidebar

## Problem
In the authenticated sidebar layout (`AppSidebar`), the FGN logo links to `/dashboard` instead of the homepage (`/`). The user wants the logo to always navigate to the landing page.

## Change

### Modify `src/components/AppSidebar.tsx`
Update the logo `NavLink` on line 56 from `to="/dashboard"` to `to="/"` so clicking the FGN logo always takes the user back to the homepage.

| Action | File | Detail |
|--------|------|--------|
| Modify | `src/components/AppSidebar.tsx` | Change logo link target from `/dashboard` to `/` |

This is a one-line change. No other files need modification -- the top Navbar already links to `/`.

