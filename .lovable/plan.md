

# Subscriber Management -- Flexible Foundation

## Summary
Build the Subscribers page and local data storage now, with a design that supports both standalone operation (CSV upload, manual entry) and future API connection to manage.fgn.gg. Authentication remains independent in both apps.

## Why This Approach
- manage.fgn.gg does not yet have API endpoints to call
- Rebuilding NISC/GLDS integrations here is not needed
- We can build the subscriber UI and database now, and add the API proxy layer later when manage.fgn.gg exposes endpoints
- Player authentication stays in both apps independently

## What Gets Built Now

### 1. Database: `tenant_subscribers` table
Stores subscriber records from any source (CSV upload now, API sync later).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| tenant_id | uuid (FK to tenants) | Required |
| account_number | text | External account ID |
| first_name | text | Nullable |
| last_name | text | Nullable |
| email | text | Nullable |
| phone | text | Nullable |
| address | text | Nullable |
| zip_code | text | Nullable |
| service_status | text | active, inactive, suspended |
| plan_name | text | Broadband plan name |
| source | text | 'csv', 'manual', 'nisc', 'glds' |
| external_id | text | ID from external system |
| synced_at | timestamptz | Last sync timestamp |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

Unique constraint on `(tenant_id, source, external_id)` to prevent duplicates.

RLS: tenant admins see only their own tenant's data; super admins see all.

### 2. Database: `tenant_integrations` table
Stores API connection config per tenant -- empty for now but ready for when manage.fgn.gg adds endpoints.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| tenant_id | uuid (FK to tenants) | Required |
| provider_type | text | 'nisc', 'glds', 'manage_fgn', 'custom' |
| display_name | text | Friendly label |
| api_url | text | Base URL |
| api_key_encrypted | text | Write-only from frontend |
| additional_config | jsonb | Flexible settings |
| is_active | boolean | Default true |
| last_sync_at | timestamptz | Nullable |
| last_sync_status | text | success, error, pending |
| last_sync_message | text | Error details |
| created_at | timestamptz | Auto |

RLS: same tenant-scoping as subscribers.

### 3. New Page: `/provider/subscribers`
Three tabs:
- **Subscribers** -- searchable table of imported records with status badges and counts
- **Upload** -- CSV file upload with preview and field mapping, bulk inserts into `tenant_subscribers`
- **Integrations** -- cards showing available systems (NISC, GLDS, manage.fgn.gg) with configure buttons. Displays "Coming Soon -- API endpoints pending" for manage.fgn.gg, with a form to save connection details in `tenant_integrations` so they are ready when the API goes live

### 4. Sidebar and Route Updates
- Add "Subscribers" link with Database icon to `ProviderSidebar.tsx`
- Add `/provider/subscribers` route in `App.tsx` wrapped in `ProviderRoute`

## What Gets Built Later (when manage.fgn.gg has API endpoints)
- Edge function `proxy-manage-api` to securely call manage.fgn.gg
- Shared API key generation and secret storage
- "Sync Now" button that pulls subscriber data via the proxy
- Automatic scheduled syncs

## Files to Create
- `src/pages/provider/ProviderSubscribers.tsx` -- main page with tabs
- `src/components/provider/SubscriberUploader.tsx` -- CSV parsing and import component
- `src/components/provider/IntegrationConfigCard.tsx` -- integration setup cards
- `src/hooks/useProviderSubscribers.ts` -- CRUD hook for tenant_subscribers
- `src/hooks/useProviderIntegrations.ts` -- CRUD hook for tenant_integrations

## Files to Modify
- `src/components/provider/ProviderSidebar.tsx` -- add Subscribers nav item
- `src/App.tsx` -- add route

## Security
- Both new tables have RLS enforcing tenant isolation
- API credentials stored server-side only, never returned to frontend after creation
- Access restricted to provider admins and super admins via existing role checks

