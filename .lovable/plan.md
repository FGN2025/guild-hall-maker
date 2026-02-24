
# NISC Integration Implementation

## Overview
Build the NISC configuration dialog, update the integrations hook with update/sync mutations, wire the dialog into the Subscribers page, and create the nisc-sync edge function -- all designed to work gracefully without an API key.

## Files to Create

### 1. `src/components/tenant/NISCConfigDialog.tsx`
A dialog component with:
- Fields: Display Name (optional), API URL (required), API Key (required, password input)
- Active/inactive toggle
- "Test Connection" button that calls the sync function in dry-run mode
- Shows last sync status when editing an existing integration
- Uses existing Dialog, Input, Label, Switch, Button components
- On save: calls `saveIntegration` (new) or `updateIntegration` (edit) from the hook

### 2. `supabase/functions/nisc-sync/index.ts`
Edge function that:
- Validates JWT via `getClaims()`
- Accepts `{ integrationId, dryRun? }` in the request body
- Reads integration config from `tenant_integrations` using service role client
- If no `api_key_encrypted`, returns `{ success: false, error: "NISC API key not yet configured" }`
- If dry run, validates the API URL is reachable and returns connection test result
- If full sync, calls the NISC API, maps response to subscriber fields, upserts into `tenant_subscribers` with `source = 'nisc'`
- Updates `last_sync_at`, `last_sync_status`, `last_sync_message` on the integration row
- Includes proper CORS headers

## Files to Edit

### 3. `src/hooks/useTenantIntegrations.ts`
Add two new mutations:
- `updateIntegration` -- updates an existing integration row by ID
- `triggerSync` -- calls the `nisc-sync` edge function via `supabase.functions.invoke()`

### 4. `src/pages/tenant/TenantSubscribers.tsx`
- Add state for `configDialogOpen` and `selectedIntegration`
- Pass `onConfigure` callback to each `IntegrationConfigCard`
- Render `NISCConfigDialog` when the NISC card is clicked
- Pass existing integration data for edit mode

### 5. `supabase/config.toml`
- Add `[functions.nisc-sync]` with `verify_jwt = false`

## Technical Details

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` (already configured) to bypass RLS when updating sync status
- Multi-tenant isolation is maintained: the function reads `tenant_id` from the integration row and scopes all subscriber upserts to that tenant
- The NISC API client is scaffolded with placeholder endpoint paths that can be updated when real API documentation is available
- No database migrations needed -- `tenant_integrations` already has all required columns (`api_url`, `api_key_encrypted`, `additional_config`, `last_sync_at`, `last_sync_status`, `last_sync_message`)
