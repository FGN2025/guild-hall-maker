

## Plan: Admin UI for Discord Bypass Requests

Create a new admin page following the same pattern as `AdminAccessRequests.tsx` — a table listing all `discord_bypass_requests` with approve/deny actions.

### Changes

**1. New page: `src/pages/admin/AdminDiscordBypass.tsx`**
- Query `discord_bypass_requests` joined with `profiles` (for display_name) ordered by `created_at` desc
- Table columns: User (display_name + user_id), Reason, Status (badge), Submitted date, Admin Notes (editable textarea), Actions (Approve / Deny buttons)
- Approve mutation: updates `status` to `approved`, sets `reviewed_by` and `reviewed_at` — the existing DB trigger handles setting `discord_bypass_approved = true` on profiles and sending a notification
- Deny mutation: updates `status` to `denied` with admin notes — trigger sends denial notification
- Filter tabs: All / Pending / Approved / Denied

**2. Update `src/App.tsx`**
- Add lazy import for `AdminDiscordBypass`
- Add route: `/admin/discord-bypass` wrapped in `AdminRoute`

**3. Update `src/components/admin/AdminSidebar.tsx`**
- Add sidebar entry for "Discord Bypass" with `ShieldCheck` icon, placed after "Access Requests"

Three files total. No database changes needed — the table, RLS policies, and trigger are already in place.

