

## Fix: FGN Academy "Sync Now" calls wrong edge function

### Root Cause

In `src/hooks/useTenantIntegrations.ts` line 91, the `triggerSync` mutation routes to edge functions with a simple binary check:

```typescript
const functionName = providerType === "glds" ? "glds-sync" : "nisc-sync";
```

When `providerType` is `"fgn_academy"`, it falls through to `"nisc-sync"`, which returns 403 (Forbidden) because the integration ID belongs to an FGN Academy record, not a NISC one.

### Fix

Update the function name resolution to handle all three provider types:

```typescript
const functionName =
  providerType === "glds" ? "glds-sync" :
  providerType === "fgn_academy" ? "sync-to-academy" :
  "nisc-sync";
```

However, `sync-to-academy` expects a different payload shape (`user_id`, `challenge_id`, `awarded_points`) — it syncs individual challenge completions, not bulk subscriber data. A tenant-level "Sync Now" for FGN Academy doesn't map to a single edge function call the same way NISC/GLDS do.

Two options for the FGN Academy sync button behavior:

1. **Disable the Sync Now button for FGN Academy** — academy syncs are triggered automatically on challenge approval, not manually. The button is misleading.
2. **Create a new `sync-all-to-academy` edge function** that iterates all unsynced completions for the tenant and pushes them. This is more useful but more work.

### Recommended approach (Option 1 — quick fix)

- Update `triggerSync` to route `fgn_academy` correctly (prevents the crash)
- Hide or disable the "Sync Now" button for FGN Academy since it auto-syncs on challenge approval
- Optionally show a tooltip: "Academy syncs happen automatically when challenges are approved"

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTenantIntegrations.ts` | Add `fgn_academy` case to function name routing |
| `src/pages/tenant/TenantSubscribers.tsx` | Conditionally hide/disable Sync Now for `fgn_academy` provider, add explanatory text |

