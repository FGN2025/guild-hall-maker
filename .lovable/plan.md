
# MVP Launch Readiness: All 10 Recommendations

Working through the 10 items from the gap analysis in order.

---

## 1. Add "Forgot Password" Flow

**What it does:** Adds a "Forgot your password?" link on the login form and a `/reset-password` page where users set a new password after clicking the email link.

**Changes:**
- **Auth.tsx** -- Add a "Forgot your password?" link below the password field (visible only in login mode). Clicking it shows an inline email input + "Send Reset Link" button that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- **New file: `src/pages/ResetPassword.tsx`** -- Checks for `type=recovery` in the URL hash, shows a "Set New Password" form, calls `supabase.auth.updateUser({ password })`. On success, redirects to `/dashboard`.
- **App.tsx** -- Add public route `/reset-password` pointing to `ResetPassword`.

---

## 2. Enable Leaked Password Protection

**What it does:** Enables the HaveIBeenPwned check on signup/password changes so compromised passwords are rejected.

**Change:**
- Use the configure-auth tool to enable leaked password protection (`min_password_length: 6`, `hibp_enabled: true`).

---

## 3. Add Lead Status Update UI + RLS Policy

**What it does:** Lets tenant admins change a lead's status (new/contacted/converted) from the Leads page.

**Changes:**
- **Database migration** -- Add an UPDATE policy on `user_service_interests` for tenant admins:
  ```
  CREATE POLICY "Tenant admins can update lead status"
    ON user_service_interests FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.tenant_id = user_service_interests.tenant_id AND ta.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM tenant_admins ta WHERE ta.tenant_id = user_service_interests.tenant_id AND ta.user_id = auth.uid()));
  ```
- **useTenantLeads.ts** -- Add an `updateLeadStatus` mutation that calls `.update({ status }).eq('id', leadId)` and invalidates the query cache.
- **TenantLeads.tsx** -- Replace the static status Badge with a `<Select>` dropdown (options: new, contacted, converted) that triggers the mutation on change. Show a toast on success/error.

---

## 4. Add Pagination to Heavy Lists

**What it does:** Adds cursor/offset-based pagination to the tournament list, leaderboard, and tenant subscriber list.

**Changes:**
- **Tournaments.tsx** -- Add state for `page` (default 1), compute `pageSize = 12`. Slice `filtered` array by page. Render `Pagination` component below the grid.
- **Leaderboard.tsx** -- Add pagination controls below both the Seasonal and All-Time tables. Page size of 25. Slice `sortedPlayers` / `filteredSeasonalPlayers`.
- **TenantSubscribers.tsx** -- Add pagination state and slice the subscriber list. Render `Pagination` below the table.
- All three pages will use the existing `src/components/ui/pagination.tsx` components.

---

## 5. Document `ecosystem_auth_tokens` RLS Intent

**What it does:** Adds a comment to the table so future developers know it's intentionally service-role-only.

**Change:**
- **Database migration** -- `COMMENT ON TABLE public.ecosystem_auth_tokens IS 'Short-lived SSO tokens managed exclusively by edge functions via service role. No client-side RLS policies by design.';`

---

## 6. Make AI Coach Accessible from Sidebar

**What it does:** Adds an "AI Coach" entry in the main sidebar navigation so users can find it without relying solely on the floating button.

**Change:**
- **AppSidebar.tsx** -- Add `{ to: "#coach", label: "AI Coach", icon: BrainCircuit }` to the `mainNav` array. Instead of navigating to a page, clicking this item will programmatically open the floating coach panel. To achieve this cleanly:
  - Create a small context/event: `src/contexts/CoachContext.tsx` with `{ isOpen, setIsOpen }`.
  - Wrap the app with `CoachProvider` in `AppLayout.tsx`.
  - Update `CoachFloatingButton` to use `useCoach()` for its open state instead of local `useState`.
  - In `AppSidebar`, the "AI Coach" menu item calls `setIsOpen(true)` on click.

---

## 7. Add Mobile-Responsive Navigation for Tenant and Admin Panels

**What it does:** On small screens, the fixed 64-width sidebar collapses into a hamburger/sheet menu.

**Changes:**
- **AdminLayout.tsx** -- Wrap the sidebar in a responsive container: on desktop show inline, on mobile show via a `Sheet` (slide-out drawer) triggered by a hamburger button in a top bar.
- **TenantLayout.tsx** -- Same pattern as AdminLayout.
- Both will use `useIsMobile()` from `src/hooks/use-mobile.tsx` and the existing `Sheet` component.

---

## 8. Seed More Realistic Test Data

**What it does:** Creates a migration with INSERT statements to populate the test environment with realistic demo data.

**Changes:**
- **Database migration** -- Insert:
  - 5-10 additional profiles (using known test user IDs or generating new ones via helper)
  - 5+ additional tournaments across different games and statuses
  - Additional match results to populate leaderboards
  - Season scores for the active season
  - Additional community topics and replies
  - A second tenant with ZIP codes and sample leads

*Note:* Since we can't create auth users via migration, this will add profiles and data for existing users, plus add more tournaments and matches. We can also add a second tenant for demo purposes.

---

## 9. Add Season Management UI in Admin Panel

**What it does:** Creates an admin page to view, create, and rotate seasons.

**Changes:**
- **New file: `src/pages/admin/AdminSeasons.tsx`** -- Table showing all seasons (name, status, start/end dates). Buttons to:
  - Create a new season (name, start date, end date)
  - Manually trigger season rotation (calls the `rotate-season` edge function)
- **Database migration** -- Add admin INSERT/UPDATE policies on `seasons` table (currently only service role can manage):
  ```
  CREATE POLICY "Admins can manage seasons" ON seasons FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
  ```
- **AdminSidebar.tsx** -- Add "Seasons" nav item with `BarChart3` icon.
- **App.tsx** -- Add `/admin/seasons` route.
- **AdminDashboard.tsx** -- Update "Active Seasons" card link from `#` to `/admin/seasons`.

---

## 10. Enable Theme Toggle (Dark/Light Mode)

**What it does:** Adds a dark/light/system theme toggle using the already-installed `next-themes` package.

**Changes:**
- **New file: `src/components/ThemeToggle.tsx`** -- A button that cycles through light/dark/system using `useTheme()` from `next-themes`. Shows Sun/Moon/Monitor icons.
- **main.tsx or App.tsx** -- Wrap the app with `<ThemeProvider attribute="class" defaultTheme="dark">`.
- **AppSidebar.tsx** -- Add the `ThemeToggle` component in the footer section, above the Sign Out button.
- **index.html** -- Ensure the `<html>` tag doesn't have a hardcoded `class="dark"` (let `next-themes` manage it).

---

## Implementation Order

The items are independent enough to implement sequentially in one pass:

1. Password reset (Auth.tsx + new page + route)
2. Leaked password protection (config change)
3. Lead status updates (migration + hook + UI)
4. Pagination (3 pages)
5. Ecosystem tokens comment (migration)
6. Coach sidebar access (new context + sidebar update)
7. Mobile admin/tenant nav (2 layouts)
8. Seed data (migration)
9. Season management (new page + migration + sidebar + route)
10. Theme toggle (new component + provider)

## Technical Notes

- All database changes use the migration tool
- No changes to auto-generated files (`client.ts`, `types.ts`, `.env`, `config.toml`)
- Existing UI patterns (glass-panel, font-display/heading/body classes, primary color scheme) will be followed
- The pagination component already exists and will be reused
- `next-themes` is already installed as a dependency
