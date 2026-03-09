

## Plan: Add Invite-by-Email to Tenant Team Page

The backend is fully ready (the `tenant_invitations` table, `send-tenant-invite` edge function, and auto-claim database trigger all exist). We just need to add the UI.

### Changes to `src/pages/tenant/TenantTeam.tsx`

1. **Add a toggle or tab** between "Search existing user" and "Invite by email" modes in the add-member section.

2. **Invite-by-email mode** shows:
   - An email input field (replacing the display name search)
   - The same role dropdown (Admin / Manager / Marketing)
   - A send invite button (Mail icon)

3. **Invite handler** logic:
   - Validate email format
   - Check if email is already a team member or has a pending invitation
   - Insert a row into `tenant_invitations` with `tenant_id`, `email`, `role`, `invited_by`
   - Call the `send-tenant-invite` edge function to send the branded email
   - Show success toast

4. **Display pending invitations** below the current team list:
   - Query `tenant_invitations` where `tenant_id` matches and `claimed_at IS NULL`
   - Show email, role, sent date
   - Add a delete/revoke button to remove pending invitations

5. **Imports**: Add `Mail`, `Clock` from lucide-react; add `useQuery`/`useQueryClient` from tanstack.

### Files Modified
- `src/pages/tenant/TenantTeam.tsx` (only file)

