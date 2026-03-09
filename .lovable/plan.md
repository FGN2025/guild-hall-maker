

## Fix: Tenant Dropdown Not Refreshing ZIP Codes Page

### Root Cause
`useTenantAdmin()` uses `useState` to hold `selectedTenantId`. Every component that calls this hook gets its **own independent state**. When the tenant dropdown (in `TenantRoute`/`TenantLayout`) calls `setSelectedTenantId`, it updates localStorage and its own React state — but `TenantZipCodes` has a separate hook instance whose state was initialized from the old localStorage value and never receives the update.

This affects **all tenant child pages**, not just ZIP Codes.

### Fix: Shared State via `useSyncExternalStore`
Create a lightweight localStorage-backed store that all `useTenantAdmin` instances subscribe to, so when any instance writes, all instances re-render.

### Changes

**File: `src/hooks/useTenantAdmin.ts`**
- Replace `useState(() => localStorage.getItem(...))` with a `useSyncExternalStore` subscriber that listens for changes to the localStorage key
- When `setSelectedTenantId` writes to localStorage, dispatch a custom `storage` event so all subscribers in the same tab re-render
- This is ~15 lines of added code at the top of the file; the rest of the hook stays the same

```text
// Conceptual change:
// Before: const [selectedTenantId, setState] = useState(() => localStorage.getItem(KEY))
// After:  const selectedTenantId = useSyncExternalStore(subscribe, getSnapshot)
//         function setSelectedTenantId(id) { localStorage.setItem(KEY, id); notify(); }
```

No other files need changes. The dropdown in `TenantLayout` and all child pages will automatically stay in sync.

