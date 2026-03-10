

## Show "No Email" for Users Without Email Addresses

### Problem
Users who registered without providing an email (e.g. via certain OAuth flows or invite links) show no indication of this in the Admin Users table. Admins may try to resend confirmation emails to users who have no email on file, which will fail silently.

### Approach
Extend the `check-users-confirmed` edge function to also return whether each user has an email. Then surface this in the UI as a "No Email" badge and disable the resend button for those users.

### Changes

| File | Change |
|------|--------|
| `supabase/functions/check-users-confirmed/index.ts` | Also return `has_email` map alongside `confirmed`, checking if `data?.user?.email` exists |
| `src/hooks/useAdminUsers.ts` | Add `has_email` field to `AdminUser` interface; merge the new `has_email` data from the edge function response |
| `src/pages/admin/AdminUsers.tsx` | Show a "No Email" badge (muted style) next to the user name when `has_email` is false; disable the resend confirmation button for those users |

### Detail

**Edge function** — add a second map:
```typescript
const hasEmail: Record<string, boolean> = {};
// inside the Promise.all loop:
confirmed[id] = !!data?.user?.email_confirmed_at;
hasEmail[id] = !!data?.user?.email;
// return both: { confirmed, has_email: hasEmail }
```

**Hook** — add `has_email: boolean` to `AdminUser`, default `true`. After fetching confirmation data, also merge `has_email`:
```typescript
has_email: confirmData.has_email?.[u.user_id] ?? true
```

**UI** — next to the "Unconfirmed" badge, show "No Email" badge when `!u.has_email`. Disable the Mail resend button when `!u.has_email`.

