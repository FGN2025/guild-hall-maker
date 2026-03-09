

## Auto-Fill City & State for Tenant ZIP Codes via Smarty API

### Level of Effort: Low-Medium
The Smarty API integration already exists (`validate-zip` edge function) with credentials configured. The work is creating a new edge function for batch lookups and wiring it into two frontend flows plus a backfill button.

### Approach

#### 1. New Edge Function: `backfill-zip-geo` 
Accepts an array of ZIP codes, calls Smarty for each (the ZIP Code API supports batch lookups of up to 100 per request), and returns a map of `zip → {city, state}`. Uses existing `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` secrets. Also updates `tenant_zip_codes` rows in-place via service role client for any rows missing city/state.

**Input:** `{ tenant_id: string }` — finds all rows with null city or state and backfills them.  
**Smarty batch endpoint:** `POST https://us-zipcode.api.smarty.com/lookup` accepts an array of `{zipcode}` objects (up to 100 per request), so we batch in chunks of 100.

#### 2. Frontend: Auto-fill on single add (`TenantZipCodes.tsx`)
When a user adds a ZIP without city/state, call `validate-zip` (already exists) to get city/state from Smarty, and pre-populate the insert. This happens transparently — no extra UI needed beyond what exists.

#### 3. Frontend: Auto-fill on CSV upload (`TenantZipCodes.tsx`)
After CSV rows are inserted, call `backfill-zip-geo` for the tenant to fill in any blanks. Show a toast like "Looked up city/state for X ZIP codes."

#### 4. Frontend: "Backfill" button (`TenantZipCodes.tsx`)
Add a "Look Up City/State" button next to Upload CSV that calls `backfill-zip-geo` for the current tenant. This handles existing data (like the 9 ZIPs shown in the screenshot).

### Files

| File | Change |
|------|--------|
| `supabase/functions/backfill-zip-geo/index.ts` | **New** — batch Smarty lookup + DB update |
| `src/pages/tenant/TenantZipCodes.tsx` | Add backfill button; auto-fill on single add; trigger backfill after CSV upload |

### No database migration needed
The `city` and `state` columns already exist on `tenant_zip_codes`. This is purely edge function + frontend work.

