

# Assessment: Tenant Admin Invite Email Not Sent

## Root Cause

The `createInvitation` mutation in `useTenants.ts` only **inserts a row** into the `tenant_invitations` table. There is **no code that sends an email** to the invited person. The invitation record is created (visible as "Pending" in the UI), but the invitee has no way of knowing they were invited.

The existing `auth-email-hook` handles Supabase Auth events (signup, recovery, magic link) — it does not trigger on tenant invitation inserts. The `invite` template there is for Supabase's built-in auth invite flow, not for custom tenant admin invitations.

## Plan

### 1. Create a `send-tenant-invite` edge function

A new backend function that:
- Accepts `{ email, tenantName, role, invitedBy }` in the request body
- Sends a branded email via Resend (using the existing `RESEND_API_KEY` and `noreply@fgn.gg` sender) telling the recipient they've been invited to manage a tenant on FGN
- Includes a CTA button linking to the signup/auth page
- Matches the existing email branding (dark header, neon cyan button, Orbitron font)

### 2. Call the edge function after successful invitation insert

In `useTenants.ts` → `createInvitation` mutation, after the successful insert into `tenant_invitations`, invoke the new edge function to send the email. Include the tenant name (fetched from context) and role in the payload.

### 3. Email template content

- Subject: "You've been invited to manage [Tenant Name] on FGN"
- Body: brief explanation that they've been invited as an [Admin/Manager/Marketing] for [Tenant Name], with a button to sign up or log in
- Matches existing email styling from `_shared/email-templates/`

| File | Change |
|---|---|
| `supabase/functions/send-tenant-invite/index.ts` | New edge function to send invitation email via Resend |
| `supabase/config.toml` | Add `[functions.send-tenant-invite]` with `verify_jwt = false` |
| `src/hooks/useTenants.ts` | Call `supabase.functions.invoke("send-tenant-invite", ...)` in `createInvitation.onSuccess` or after insert |

No database changes needed.

