

# Create Tenant Admin Guide

## Overview

Create a new `TenantGuide` page at `/tenant/guide` following the exact same pattern as the Moderator Guide and Admin Guide -- accordion sections with search, table of contents, export PDF, and back-to-top button.

## Files to Create/Modify

### 1. Create `src/pages/tenant/TenantGuide.tsx` (new file)

Follow the ModeratorGuide pattern exactly. Include these sections based on the tenant portal features:

- **Roles Overview** -- Admin vs Manager vs Marketing roles and their access levels
- **Dashboard** -- Quick stats (total leads, new leads, converted, ZIP codes covered)
- **Player Directory** -- Unified view of new registered players and legacy records, searchable, source tagging
- **Leads** -- Users who matched service area ZIP codes, status management (new/contacted/converted)
- **Events** -- Create/edit/delete tenant events, publish publicly, attach hero images, status flow (draft/published/in_progress/completed/cancelled), public event pages at /events/:tenant-slug
- **ZIP Codes** -- Manage service area ZIP codes (admin only)
- **Subscribers** -- Manual entry, CSV upload, paginated/searchable table, status tracking
- **Integrations** -- NISC/GLDS billing system connections, test connection, sync now, sync history with filtering/pagination/CSV export
- **Marketing** -- Browse platform campaigns, filter by category, calendar embed publishing
- **My Assets** -- Upload/manage tenant-specific marketing assets
- **Team Management** -- Invite managers/marketing users by display name, role assignment, removal (admin only)
- **Settings** -- Logo upload, contact email, brand colors (primary/accent)
- **Notifications** -- Automated notifications for leads and events

### 2. Modify `src/App.tsx`

Add route: `<Route path="/tenant/guide" element={<TenantRoute><TenantGuide /></TenantRoute>} />`

### 3. Modify `src/components/tenant/TenantSidebar.tsx`

Add a "Guide" sidebar link with `BookOpen` icon, available to all roles (admin, manager, marketing), positioned before "Back to App".

