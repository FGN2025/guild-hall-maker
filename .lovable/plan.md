

# Fix: Add Admin Button Provides No Feedback on Empty Input

## Problem
On `/admin/tenants`, clicking the "Add Admin" (UserPlus icon) button with an empty search field does nothing -- no error message, no visual feedback. The code silently returns when the input is blank.

## Solution

**File: `src/pages/admin/AdminTenants.tsx`**

Update the `handleAdd` function in `TenantAdminPanel` to show a toast error when the input is empty, so users know they need to type a display name first.

Change:
```tsx
const handleAdd = async () => {
    if (!email.trim()) return;
```

To:
```tsx
const handleAdd = async () => {
    if (!email.trim()) {
      toast.error("Please enter a display name to search for.");
      return;
    }
```

This is a one-line fix that gives users clear feedback when they click the button without entering a search term.

