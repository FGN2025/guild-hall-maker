

## Problem

The `legacy_users` table has both `address` and `zip_code` columns. Many legacy records likely have an `address` but no `zip_code`. We can parse ZIP codes from the address field to backfill the `zip_code` column.

## Plan

### 1. Create a backend function to extract ZIPs from addresses

Create a new edge function `backfill-legacy-zips` that:
- Queries `legacy_users` for a given `tenant_id` where `zip_code IS NULL` and `address IS NOT NULL`
- Extracts 5-digit ZIP codes from the `address` string using regex (`/\b\d{5}\b/`)
- Optionally validates extracted ZIPs against the Smarty API (already configured with `SMARTY_AUTH_ID` / `SMARTY_AUTH_TOKEN`)
- Updates `legacy_users.zip_code` for each matched record
- Returns a count of updated records

### 2. Add a "Backfill ZIPs" button to the Tenant Players page

Update `src/pages/tenant/TenantPlayers.tsx`:
- Add a button (e.g. "Extract ZIPs from Addresses") near the search bar
- On click, call the edge function with the current `tenant_id`
- Show a toast with the result count
- Refetch the player list to show updated ZIP data

### 3. Include address in the player query

Update `src/hooks/useTenantPlayers.ts`:
- Add `address` to the legacy_users select query
- Surface it in the `UnifiedPlayer` interface so it's available for display or debugging

### Files

| File | Change |
|------|--------|
| `supabase/functions/backfill-legacy-zips/index.ts` | New edge function: regex-extract ZIPs from address, validate via Smarty, update `zip_code` |
| `src/hooks/useTenantPlayers.ts` | Add `address` to legacy query select, add to `UnifiedPlayer` interface |
| `src/pages/tenant/TenantPlayers.tsx` | Add "Extract ZIPs" button, call edge function, show results |

### Edge Function Logic
```text
1. Query legacy_users WHERE tenant_id = ? AND zip_code IS NULL AND address IS NOT NULL
2. For each record, regex match /\b(\d{5})\b/ from address
3. Batch-validate extracted ZIPs via Smarty API (reuse existing credentials)
4. Update legacy_users.zip_code for valid matches
5. Return { updated: N, skipped: M }
```

