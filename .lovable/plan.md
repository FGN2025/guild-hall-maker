

# Implement Smarty ZIP Code Validation

## Step 1: Store Smarty Secrets
Prompt you to securely enter both values:
- **SMARTY_AUTH_ID** -- your embedded/public key
- **SMARTY_AUTH_TOKEN** -- your secret key

## Step 2: Create `validate-zip` Edge Function
**New file:** `supabase/functions/validate-zip/index.ts`

- Reads `SMARTY_AUTH_ID` and `SMARTY_AUTH_TOKEN` from environment
- Accepts POST with `{ zipCode }` body
- Calls Smarty API: `https://us-zipcode.api.smarty.com/lookup?auth-id=...&auth-token=...&zipcode=XXXXX`
- If Smarty returns valid city/state data, calls `lookup_providers_by_zip` RPC via Supabase service role client
- Returns `{ valid, city, state, providers[] }`
- Includes CORS headers and OPTIONS handling

Also update `supabase/config.toml` to add `[functions.validate-zip]` with `verify_jwt = false` (public registration endpoint).

## Step 3: Update `useRegistrationZipCheck` Hook
**Modify:** `src/hooks/useRegistrationZipCheck.ts`

- Replace the `national_zip_codes` table query with a call to `supabase.functions.invoke('validate-zip', { body: { zipCode } })`
- Use city/state from Smarty response in the success message (e.g., "Valid ZIP: Springfield, IL")
- Keep bypass code logic completely unchanged (still calls `validate_bypass_code` RPC directly from frontend)
- Keep provider list handling unchanged

## What stays the same
- Bypass code validation (unchanged)
- `ZipCheckStep` UI component (unchanged)
- `Auth.tsx` page (unchanged)
- `national_zip_codes` table remains but is no longer queried during registration

## Files

| Action | File |
|--------|------|
| Create | `supabase/functions/validate-zip/index.ts` |
| Modify | `supabase/config.toml` |
| Modify | `src/hooks/useRegistrationZipCheck.ts` |

