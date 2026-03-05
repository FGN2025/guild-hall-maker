

# Fix: Embedded Calendar Shows Login Page

## Root Cause

Two issues are combining to block public access:

1. **Embed URL points to preview domain**: `CalendarPublishManager.tsx` uses `window.location.origin` to build the iframe snippet. When an admin copies this from the Lovable preview, the URL requires Lovable platform authentication. It needs to point to the published domain (`play.fgn.gg`).

2. **RLS policies may not grant anon access**: The existing SELECT policies on `calendar_publish_configs`, `tournaments`, and `tenant_events` need to be explicitly `AS PERMISSIVE` for the `anon` role. Without a permissive policy, anonymous users get zero rows even if a restrictive policy would match.

## Changes

### 1. Update `BASE_URL` in `CalendarPublishManager.tsx`

Change line 23 from:
```typescript
const BASE_URL = window.location.origin;
```
to:
```typescript
const BASE_URL = "https://play.fgn.gg";
```

This ensures the copied embed snippet and displayed URL always point to the publicly accessible published site.

### 2. Database Migration — Recreate Anon SELECT Policies as Permissive

Drop the current anon-facing SELECT policies and recreate them with `AS PERMISSIVE` explicitly:

- **`calendar_publish_configs`**: Drop "Anon and authenticated can view active configs", recreate `AS PERMISSIVE` for `anon, authenticated` where `is_active = true`
- **`tournaments`**: Drop "Anon can read tournaments", recreate `AS PERMISSIVE` for `anon` with `USING (true)`
- **`tenant_events`**: Drop "Anon can view public tenant events", recreate `AS PERMISSIVE` for `anon` where `is_public = true AND status = 'published'`

## Files Changed

| File | Change |
|---|---|
| `src/components/admin/CalendarPublishManager.tsx` | Set `BASE_URL` to `https://play.fgn.gg` |
| New migration SQL | Recreate 3 SELECT policies as explicitly `AS PERMISSIVE` |

No other code changes needed — routing is already correct.

