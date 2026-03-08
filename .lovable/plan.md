

## Fix: Always Show Marketing Sidebar on Marketing Routes

### Problem
`MarketingRoute` currently checks `isAdmin` and renders `AdminLayout` (full 17-item sidebar) for admin users. Since you're an admin, you see the full admin sidebar instead of the scoped marketing sidebar when on `/admin/marketing`.

### Solution
Change `MarketingRoute` to **always** use `MarketingLayout` regardless of whether the user is an admin or marketing-only. When an admin navigates to the marketing section, they should see the marketing-scoped sidebar — just like how the Moderator and Tenant panels show their own scoped sidebars even for admins.

### Change
**`src/components/admin/MarketingRoute.tsx`** — Remove the `isAdmin` branch and always render `MarketingLayout`:

```tsx
// Before:
if (isAdmin) return <AdminLayout>{children}</AdminLayout>;
return <MarketingLayout>{children}</MarketingLayout>;

// After:
return <MarketingLayout>{children}</MarketingLayout>;
```

Also remove the unused `AdminLayout` import.

Single file, 3-line change.

