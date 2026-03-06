

# Fix Duplicate Admin Sidebar on Access Requests Page

## Problem
`AdminAccessRequests` wraps its content in `<AdminLayout>`, but it's rendered via `<AdminRoute>` which already wraps children in `<AdminLayout>`. This causes a double sidebar.

## Fix
**`src/pages/admin/AdminAccessRequests.tsx`**: Remove the `<AdminLayout>` wrapper. Replace it with a plain fragment or div, keeping just the page content. Remove the `AdminLayout` import.

This is a one-line pattern fix — the page content stays identical, only the redundant layout wrapper is removed.

