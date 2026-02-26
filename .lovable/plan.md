

## Fix: Double Sidebar on Admin Marketing Page

### Problem
The Admin Marketing page renders **two sidebars** because:
1. `AdminRoute` (line 27) wraps its children in `<AdminLayout>`
2. `AdminMarketing` (line 45) also wraps its content in `<AdminLayout>`

This causes the sidebar to appear twice.

### Fix
Remove the `<AdminLayout>` wrapper from `AdminMarketing.tsx`. The route-level `AdminRoute` already provides it.

### Technical Detail
In `src/pages/admin/AdminMarketing.tsx`, change:
```tsx
// Before
return (
  <AdminLayout>
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      ...
    </div>
  </AdminLayout>
);

// After
return (
  <div className="p-6 max-w-6xl mx-auto space-y-6">
    ...
  </div>
);
```

Remove the `AdminLayout` import as well. This is a one-line structural fix -- no other files need changes.

