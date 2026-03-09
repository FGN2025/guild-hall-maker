

## Reverse Lookup: City+State → ZIP Code (Option C — Refined)

### Rules
- **1 ZIP returned**: Auto-fill the ZIP. Do NOT mark as estimated.
- **Multiple ZIPs returned**: Use the first ZIP. Mark as estimated (amber highlight).
- **No ZIPs returned**: Leave ZIP blank for manual entry.

### Database Migration
```sql
ALTER TABLE public.tenant_zip_codes ADD COLUMN zip_estimated boolean NOT NULL DEFAULT false;
```

### Edge Function: `supabase/functions/backfill-zip-geo/index.ts`
Add a second pass after existing zip→city/state logic:
1. Query rows where `zip_code` is null/empty but `city` and `state` are populated
2. Deduplicate by city+state pair, call Smarty API with each pair
3. If `zipcodes.length === 1` → set `zip_code`, leave `zip_estimated = false`
4. If `zipcodes.length > 1` → set `zip_code` to first result, set `zip_estimated = true`
5. Return updated counts in response

### Frontend: `src/pages/tenant/TenantZipCodes.tsx`
- **CSV parser**: Accept rows where ZIP column is blank but city+state columns have values
- **ZipEntry interface**: Add `zip_estimated: boolean`
- **Table rows**: Rows with `zip_estimated = true` get an amber background and a warning badge/icon next to the ZIP code (e.g. "Estimated — multiple ZIPs serve this city")
- **CSV format hint**: Update helper text to mention city+state-only rows are supported

### Files

| File | Change |
|------|--------|
| DB migration | Add `zip_estimated boolean default false` column |
| `supabase/functions/backfill-zip-geo/index.ts` | Add reverse city+state → ZIP pass |
| `src/pages/tenant/TenantZipCodes.tsx` | Accept blank-ZIP CSV rows; amber highlight for estimated ZIPs |

