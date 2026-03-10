

## Enforce Email Required + Confirmation Gate

### Problem
Currently, users can potentially register without an email and access the app without confirming their email address. The requirement is that **all users must provide an email** and **must confirm it** before accessing any role-gated functionality.

### Approach

Supabase's `User` object includes `email_confirmed_at` — if `null`, the user hasn't confirmed. We'll expose an `emailConfirmed` boolean from AuthContext, then gate access in `ProtectedRoute`, `ConditionalLayout`, and role-specific routes. Unconfirmed users get redirected to a new `/confirm-email` page that instructs them to check their inbox, with a resend option.

The email field on the signup form is already required, but we'll add explicit validation to prevent empty/missing emails from slipping through.

### Changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `emailConfirmed: boolean` to context, derived from `user?.email_confirmed_at` |
| `src/pages/ConfirmEmail.tsx` | **New page** — shows "Check your inbox" message with resend button. Polls auth state so it auto-redirects once confirmed. |
| `src/components/ProtectedRoute.tsx` | After auth check, if `!emailConfirmed` redirect to `/confirm-email` |
| `src/components/ConditionalLayout.tsx` | If logged in but `!emailConfirmed`, redirect to `/confirm-email` instead of showing app layout |
| `src/components/moderator/ModeratorRoute.tsx` | Add `emailConfirmed` gate before role check |
| `src/components/tenant/TenantRoute.tsx` | Add `emailConfirmed` gate before role check |
| `src/components/admin/AdminRoute.tsx` | Add `emailConfirmed` gate before role check |
| `src/App.tsx` | Add `/confirm-email` route (public, not behind ProtectedRoute) |
| `src/pages/Auth.tsx` | Ensure email field has `required` and is validated non-empty before submit (already mostly done — just tighten the invite flow to also require email) |

### ConfirmEmail Page Design
- FGN logo + "Confirm Your Email" heading
- Shows the user's email address
- "Resend Confirmation" button (calls `resend-confirmation` edge function with user_id)
- "Sign Out" link to return to login
- Auto-refreshes session every few seconds; once `email_confirmed_at` is set, redirects to `/dashboard`

### Auth Flow Summary
```text
User signs up → confirmation screen (existing)
User logs in (unconfirmed) → redirected to /confirm-email
User confirms email → auto-redirect to /dashboard
```

