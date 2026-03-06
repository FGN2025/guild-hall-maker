

# Assessment: Bulk ZIP Code Import for Tenants

## Current State
- **75 rows** in the CSV; ~45 have ZIP codes, ~30 have no ZIPs (empty)
- **61 tenants** already exist in the database
- **4 ZIP code entries** currently exist in `tenant_zip_codes`
- The `tenant_zip_codes` table is already set up with the right schema (`tenant_id`, `zip_code`, `city`, `state`) and a unique constraint on `(tenant_id, zip_code)`

## CSV-to-Tenant Matching Analysis
Most CSV provider names match existing tenant names exactly (Adams Fiber, ASTAC, Bluepeak, CASSCOMM, etc.). A few CSV entries reference providers that do NOT exist as tenants yet:
- Heart of Iowa Communications, Griswold Communications, Co-Mo Connect, Marne Elk Horn, Preston Telephone Company, ADM Community School District, DxTEL, TCW, WTFast, HCI, IAHSEA, HSEL, Fiber Gaming Network

Many of these unrecognized entries have no ZIP codes anyway, but some do (e.g., Heart of Iowa, Griswold, Co-Mo Connect, Marne Elk Horn, Preston Telephone Company).

## Recommended Approach: Admin Bulk ZIP Importer (lower risk)

Rather than a one-time script, build a reusable **Admin UI tool** on the Tenants page that:

1. **Accepts CSV upload** in the format `Provider Name, Zipcodes` (comma-separated ZIPs in a single cell)
2. **Parses and matches** each provider name against existing tenants (case-insensitive)
3. **Shows a review screen** with three categories:
   - **Matched** -- provider found, ZIPs ready to import (with tenant name + ZIP count)
   - **No ZIPs** -- provider row has no ZIP codes (skip automatically)
   - **Unmatched** -- provider not found; admin can choose to: skip, assign to an existing tenant via dropdown, or create a new tenant
4. **Imports on confirm** -- upserts matched ZIPs into `tenant_zip_codes`

### Additionally: ZIP Code Management on Tenant Cards
Add a "ZIP Codes" button to each tenant card on the Admin Tenants page (alongside Admins button) that opens a sheet showing the tenant's ZIP count and links to manage them. This gives admins a per-tenant entry point.

## Files Changed

### `src/pages/admin/AdminTenants.tsx`
- Add a "Bulk Import ZIPs" button in the header (next to "Add Provider")
- Add a `BulkZipImportDialog` component (can be inline or separate) with:
  - CSV file input
  - Parsing logic that splits `"zip1, zip2, zip3"` format
  - Match each row against `tenants` list by name (case-insensitive trim)
  - Review table showing matched/unmatched/empty rows
  - For unmatched rows: dropdown to pick an existing tenant or "Create New" or "Skip"
  - Import button that upserts into `tenant_zip_codes` in chunks
- Add a "ZIP Codes" count badge + button on each `TenantCard` that opens ZIP management (reusing or linking to the existing tenant ZIP page pattern)

### `src/components/admin/BulkZipImportDialog.tsx` (new)
- Standalone dialog component for the bulk import workflow
- Props: `tenants` array for matching, `onComplete` callback
- States: file parsing, review table, import progress
- Uses `supabase.from("tenant_zip_codes").upsert()` with `onConflict: "tenant_id,zip_code"`

No database changes needed -- the `tenant_zip_codes` table and its unique constraint already exist.

