

## Plan: Allow Marketing Role to Access Events + Add "Request Moderator" Button

### Changes Required

**1. Grant Marketing role access to Events sidebar item**

In `src/components/tenant/TenantSidebar.tsx` (line 44), add `'marketing'` to the Events sidebar item roles array — currently only `['admin', 'manager']`.

**2. Add "Request Moderator" button to each event card**

In `src/pages/tenant/TenantEvents.tsx`, add a button (e.g., with a `ShieldCheck` icon) labeled "Request Moderator" to each event card's action row. Clicking it opens a confirmation dialog, then invokes the `send-notification-email` edge function with a new type.

**3. Extend the notification email edge function**

In `supabase/functions/send-notification-email/index.ts`, add a new email type `moderator_request` that:
- Sends to `support@fgn.gg`
- Subject: "Moderator Request: [Event Name]"
- Body includes: event name, date, tenant name, and the requestor's email so FGN support can respond

### Technical Details

- **Sidebar**: Change line 44 roles from `['admin', 'manager']` to `['admin', 'manager', 'marketing']`
- **RLS**: The existing `is_tenant_marketing_member` DB function already grants access to admin + marketing roles, so if tenant_events RLS uses that function, marketing users can already read/write. If RLS uses `is_tenant_member` (any role), it already works. No DB migration needed.
- **Edge function**: Add `"moderator_request"` to the Payload type union and add a handler that constructs an email to `support@fgn.gg` with event details and requestor email
- **UI**: The request button calls `supabase.functions.invoke("send-notification-email", { body: { type: "moderator_request", ... } })` with the event name, tenant name, and user email. Shows a toast on success.

