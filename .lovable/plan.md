

## Automated Tenant (Provider) Onboarding Flow

### Problem
After a broadband provider signs up at `/for-providers` and completes Stripe checkout, they land on the tenant dashboard with no guidance. There is no setup wizard, checklist, or contextual nudges to walk them through branding, ZIP codes, first event creation, or team invites. This increases time-to-value and support burden.

### Solution
A guided onboarding checklist that appears on the Tenant Dashboard for newly provisioned tenants. It tracks setup completion across key milestones and provides direct action links to each step.

### Design

**New database column:** `tenants.onboarding_completed` (boolean, default `false`) to persist completion state.

**New component:** `TenantOnboardingChecklist` — a dismissible card rendered at the top of the Tenant Dashboard when `onboarding_completed` is false.

**Checklist steps (tracked client-side via existing data):**

| Step | Label | Detection Logic | Action |
|------|-------|----------------|--------|
| 1 | Upload Logo | `tenants.logo_url IS NOT NULL` | Link to `/tenant/settings` |
| 2 | Set Brand Colors | `tenants.primary_color` differs from default | Link to `/tenant/settings` |
| 3 | Add ZIP Codes | `tenant_zip_codes` count > 0 | Link to `/tenant/zip-codes` |
| 4 | Create First Event | `tenant_events` count > 0 | Link to `/tenant/events` |
| 5 | Invite a Team Member | `tenant_invitations` count > 0 OR `tenant_admins` count > 1 | Link to `/tenant/team` |

**Auto-complete:** When all 5 steps are detected as done, a "Mark Setup Complete" button appears. Clicking it sets `tenants.onboarding_completed = true` and hides the checklist permanently. A "Dismiss" option allows hiding it early.

### Changes

1. **Database migration** — Add `onboarding_completed boolean NOT NULL DEFAULT false` to `tenants` table.

2. **`src/components/tenant/TenantOnboardingChecklist.tsx`** (new) — Card component with:
   - Progress bar showing X/5 steps complete
   - Each step as a row with check/circle icon, label, description, and "Set up" link
   - Completed steps shown with green checkmark, pending steps with outline circle
   - "Mark Complete" and "Dismiss" actions
   - Queries the 5 data sources on mount to determine step completion

3. **`src/pages/tenant/TenantDashboard.tsx`** — Import and render `TenantOnboardingChecklist` above the stats grid when `tenantInfo` exists and `onboarding_completed` is false. Pass `tenantId` as prop.

4. **`src/hooks/useTenantAdmin.ts`** — Include `onboarding_completed` in the tenant query so the dashboard can conditionally render the checklist without an extra fetch.

### UX Details
- Checklist uses the existing tenant brand color CSS variables for visual consistency
- Each step row is a clickable card that navigates to the relevant settings page
- Progress bar fills proportionally (0–100%) as steps complete
- Confetti toast on completing all 5 steps
- Platform admins viewing in admin mode do not see the checklist

