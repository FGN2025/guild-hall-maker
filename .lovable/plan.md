

# Cross-App Authentication via Magic Link Handoff

## Overview

Restrict FGN Ecosystem links to admin/moderator roles only, and implement a magic link handoff so authorized users can seamlessly access hub.fgn.gg and manage.fgn.gg without needing separate credentials.

## How It Works

```text
User clicks "Manage" link in sidebar
        |
        v
play.fgn.gg calls edge function
        |
        v
Edge function verifies user role (admin/moderator/tenant_admin)
        |
        v
Edge function sends magic link email via Resend
  (link points to manage.fgn.gg/auth?token=...)
        |
        v
User receives email, clicks link
        |
        v
Target app validates token and logs user in
```

## Phase 1: Restrict Ecosystem Links (This Plan)

### 1. Hide ecosystem links from non-privileged users

**TenantSidebar.tsx**: The ecosystem links section is already only visible to tenant admins (since TenantRoute guards access). No change needed here -- tenant admins are authorized.

**AppSidebar.tsx**: No ecosystem links currently exist here. No change needed.

**Navbar.tsx**: No ecosystem links currently exist here. No change needed.

**TenantSubscribers.tsx**: The integration cards for manage.fgn.gg and hub.fgn.gg are already inside the tenant admin panel. No change needed.

**AdminSidebar.tsx**: Add the FGN Ecosystem links section here too, so admins can also access the other apps. Currently only tenant admins see these links.

### 2. Create the magic link edge function

**New file**: `supabase/functions/ecosystem-magic-link/index.ts`

This edge function will:
- Accept a POST with `{ target: "manage" | "hub" }` and the user's auth token
- Verify the user is an admin, moderator, or tenant admin via the `user_roles` and `tenant_admins` tables
- Generate a short-lived token (UUID stored in a new `ecosystem_auth_tokens` table with 10-minute expiry)
- Send an email via Resend with a magic link to the target app
- Return success/failure

### 3. Create the ecosystem auth tokens table

**New migration**:

```sql
CREATE TABLE public.ecosystem_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  target_app text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ecosystem_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Only the edge function (service role) writes/reads this table
-- No client-side access needed
```

### 4. Replace direct links with magic link buttons

**TenantSidebar.tsx** and **AdminSidebar.tsx**: Change ecosystem links from direct `<a href>` tags to buttons that call the edge function. Show a toast like "Check your email for a login link to [app name]".

### 5. Create a reusable hook

**New file**: `src/hooks/useEcosystemAuth.ts`

A hook that:
- Calls the `ecosystem-magic-link` edge function
- Handles loading/error states
- Shows success/error toasts

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/ecosystem-magic-link/index.ts` | Edge function to verify role and send magic link |
| `src/hooks/useEcosystemAuth.ts` | Client hook to trigger magic link requests |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add FGN Ecosystem section with magic link buttons |
| `src/components/tenant/TenantSidebar.tsx` | Replace direct links with magic link buttons |

## Database Changes

| Change | Details |
|--------|---------|
| New table `ecosystem_auth_tokens` | Stores short-lived tokens for cross-app auth |

## Important Notes

- The magic link email will be sent via Resend (already configured with `RESEND_API_KEY`)
- Tokens expire after 10 minutes and are single-use
- The receiving apps (hub.fgn.gg, manage.fgn.gg) will need a corresponding endpoint to validate tokens -- this is a future step on those apps
- No regular users will see ecosystem links anywhere in the UI
- The `provider_type` field in `tenant_integrations` is unrelated to this feature

