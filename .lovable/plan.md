# ZIP Validation: Local-First, Smarty-as-Fallback

## Goal

Use customer-uploaded data (`tenant_zip_codes`, with `national_zip_codes` as backup) as the authoritative source for ZIP validation and city/state. Only call Smarty when we have nothing locally. This reduces API spend, removes a network dependency for known ZIPs, and makes validation deterministic for the customer's service area.

## Today (for reference)

```text
ZIP entered
  -> format check
  -> Smarty (always)            <-- city/state only, swallowed on error
  -> lookup_providers_by_zip    <-- queries tenant_zip_codes (authoritative)
  -> return providers + label
```

## New flow

```text
ZIP entered
  -> format check
  -> lookup_providers_by_zip (tenant_zip_codes)
     |
     +-- HIT  -> use tenant_zip_codes.city/state as label; skip Smarty
     |
     +-- MISS -> look up national_zip_codes for city/state
                 |
                 +-- HIT  -> return "no providers in <city, ST>" message
                 +-- MISS -> call Smarty as last resort
                             |
                             +-- HIT  -> return "no providers in <city, ST>"
                             +-- MISS -> "ZIP <code> not recognized"
```

## Changes

### 1. RPC: enrich `lookup_providers_by_zip` to return city/state

Update the existing `SECURITY DEFINER` function to also return the first tenant_zip_codes row's city/state (any tenant's row is fine — same ZIP = same city). Signature becomes:

```sql
RETURNS TABLE(tenant_id uuid, tenant_name text, tenant_slug text, logo_url text, city text, state text)
```

No call-site breakage: existing callers just ignore the extra columns.

### 2. Edge function: reorder + add national fallback

In `supabase/functions/validate-zip/index.ts`:
- Call `lookup_providers_by_zip` first.
- If `providers.length > 0`, set `city`/`state` from the first row, set `smarty_ok=true` (semantically: "we know this location"), and **skip** the Smarty fetch.
- If no providers, query `national_zip_codes` for city/state.
- Only if both lookups miss, call Smarty.
- Preserve existing response shape (`valid`, `city`, `state`, `smarty_ok`, `providers`, `no_providers_message`, `message`) so the client (`useRegistrationZipCheck`, `ZipCheckStep`) needs no changes.

### 3. (Optional, flagged for follow-up — not in this migration)

`national_zip_codes` has only 1 row. To make the local-only path actually useful as a city/state fallback, we'd want to load a USPS/Census ZIP dataset into it. Out of scope for this change; calling it out so we can plan it separately. Until then, the fallback flow still works — it just hits Smarty more often for out-of-area ZIPs.

## Verification

- ZIP `46055` (NineStar): returns NineStar provider, label "McCordsville, IN", **zero** Smarty calls (check edge function logs).
- ZIP `00000`: invalid format -> 400.
- ZIP `90210` (no tenant, not in national table yet): falls through to Smarty, returns "no providers in Beverly Hills, CA".
- ZIP `99999` (unassigned, Smarty miss): returns "ZIP 99999 not recognized."
- Sign-up wizard `ZipCheckStep` flow unchanged.

## Out of scope

- Bulk-loading `national_zip_codes` (separate task, needs dataset decision).
- `useRegistrationZipCheck`/UI changes — response shape preserved.
- Tenant-side ZIP upload UI (`TenantZipCodes.tsx`) — unchanged.
- The orphan-registrations sweep we discussed earlier — still queued separately.
