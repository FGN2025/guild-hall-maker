

## Slim Down Navbar for Authenticated Users

### Problem
The Index page (`/`) directly renders the `<Navbar />` component. For authenticated users (including admins), this shows all 13 nav items in the header, even though they already have access to everything via the sidebar. This was fixed for unauthenticated users (showing only Tournaments + Challenges) but not for logged-in users.

### Solution
In `src/components/Navbar.tsx`, add a third nav items list for authenticated users that only includes:
- Tournaments
- Challenges  
- Calendar
- Dashboard

Then update the `activeNavItems` selection logic:
- **Not logged in** → `publicNavItems` (Tournaments, Challenges)
- **Logged in** → `authNavItems` (Tournaments, Challenges, Calendar, Dashboard)

The Admin, Moderator, and Tenant links will also remain as they are (conditionally shown). The Sign Out button already exists in the header for logged-in users.

### File Changed
- `src/components/Navbar.tsx` — Add `authNavItems` array, update `activeNavItems` to use it for logged-in users instead of the full `navItems` list.

