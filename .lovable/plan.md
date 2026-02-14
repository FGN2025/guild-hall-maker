

# Integrate Smarty ZIP Code Validation

## Overview
Replace the current `national_zip_codes` database table lookup with Smarty's US ZIP Code API for real-time ZIP validation during registration. This gives you access to the full US ZIP database without needing to import/maintain CSV data.

## What Changes

### 1. Store Smarty credentials as secrets
Smarty requires two credentials for their API:
- **auth-id**: `260377163906526147` (you provided this)
- **auth-token**: A secret token from your Smarty account keys page

You will be prompted to enter both values securely.

### 2. Create a backend function: `validate-zip`
A new backend function that:
- Receives a ZIP code from the frontend
- Calls `https://us-zipcode.api.smarty.com/lookup` with your Smarty credentials
- Returns city, state, and validity status
- Still runs the existing `lookup_providers_by_zip` query for provider matching

### 3. Update the registration ZIP check hook
Modify `src/hooks/useRegistrationZipCheck.ts` to:
- Call the new `validate-zip` backend function instead of querying `national_zip_codes`
- Use the city/state data returned by Smarty in the success message
- Keep the existing bypass code logic and provider lookup unchanged

## Flow

```text
User enters ZIP
       |
       v
Frontend calls validate-zip edge function
       |
       v
Edge function calls Smarty US ZIP Code API
       |
       v
Valid? --No--> Return error "Invalid ZIP"
  |
  Yes
  |
  v
Edge function calls lookup_providers_by_zip RPC
       |
       v
Return city, state, providers to frontend
```

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/validate-zip/index.ts` | Backend function calling Smarty API + provider lookup |
| Modify | `src/hooks/useRegistrationZipCheck.ts` | Call edge function instead of `national_zip_codes` table |

## Technical Details

### Edge function: `validate-zip`
```text
- Reads SMARTY_AUTH_ID and SMARTY_AUTH_TOKEN from environment
- GET https://us-zipcode.api.smarty.com/lookup?auth-id=...&auth-token=...&zipcode=XXXXX
- Smarty returns an array; if result has valid city/state data, ZIP is valid
- Then calls lookup_providers_by_zip via Supabase service role client
- Returns JSON: { valid, city, state, providers[] }
```

### Secrets needed
- `SMARTY_AUTH_ID` = `260377163906526147`
- `SMARTY_AUTH_TOKEN` = (from your Smarty account keys page)

### What stays the same
- Bypass code validation (unchanged)
- Provider lookup via `lookup_providers_by_zip` RPC (unchanged)
- ZipCheckStep UI component (unchanged)
- The `national_zip_codes` table remains in the database but is no longer queried during registration

