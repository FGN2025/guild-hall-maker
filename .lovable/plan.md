

## Problem

The user `darcy@wtfast.com` exists in the system with display name **"RacerX_3"** and is not deleted or banned. The reason they cannot find this user is that the Admin Users search only queries `display_name` and `gamer_tag` — **it does not search by email**. Searching for "darcy" or "wtfast" yields no results because the display name is "RacerX_3".

Additionally, the session replay reveals a **critical bug**: the "User deleted" toast fires even after clicking Cancel in the confirmation dialog. This is a race condition in how `AlertDialogAction` interacts with `onOpenChange`.

## Plan (2 fixes)

### 1. Add email search to the Admin Users query
In `src/hooks/useAdminUsers.ts`, after fetching profiles and before returning results, cross-reference the `check-users-confirmed` edge function data (which already returns emails) or add a separate lookup so the search filter also matches against user emails. The simplest approach: use the existing `check-users-confirmed` response to populate an email field on each user, then filter client-side by email too.

Alternatively, add an `email` column to the `AdminUser` interface and populate it from the edge function response, then update the search `.or()` filter or do post-fetch client-side filtering that includes email.

### 2. Fix the Cancel-still-deletes bug
In `src/pages/admin/AdminUsers.tsx`, the `ConfirmDialog`'s `onConfirm` callback is wired to `AlertDialogAction`'s `onClick`. The Radix `AlertDialogAction` also closes the dialog, triggering `onOpenChange(false)` → `setConfirmAction(null)`. This creates a race where the mutation might fire at unexpected times.

**Fix**: Move the `onConfirm` handler so it only fires on the explicit confirm click, and ensure `setConfirmAction(null)` happens **after** the mutation call, not as a side-effect of dialog close. Specifically, prevent `onOpenChange` from clearing `confirmAction` when the dialog closes due to confirmation (only clear on cancel).

### Files to modify
- `src/hooks/useAdminUsers.ts` — add email to `AdminUser`, populate from edge function, include in search filtering
- `src/pages/admin/AdminUsers.tsx` — display email in table, fix confirm dialog race condition

