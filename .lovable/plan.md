

# Connect to manage.fgn.gg via API

## Assessment

### What manage.fgn.gg already does
- Subscriber verification against ISP billing systems (NISC, GLDS)
- Provider selection UI with multiple ISPs configured
- Access code generation after verification
- Admin portal for managing providers and verification settings

### What this app already does
- Multi-tenant provider management (tenants, tenant_admins, tenant_zip_codes)
- Lead tracking via user_service_interests
- Provider admin dashboard with ZIP code management
- Role-based access (super admin, provider admin)

### Recommendation: API Integration (not rebuild)
Rebuilding NISC/GLDS integrations would duplicate complex, proprietary billing-system connections that are already working in manage.fgn.gg. Instead, this app should call manage.fgn.gg's API for subscriber-related operations and display the results in the provider admin.

## What We Need to Build

### 1. Edge Function: `proxy-manage-api`
A backend function that securely proxies requests from this app to manage.fgn.gg. This keeps API credentials server-side and adds authorization checks.

- Accepts requests from authenticated provider admins or super admins
- Forwards calls to manage.fgn.gg endpoints (subscriber lookup, verification status, provider config)
- Returns the response to the frontend

### 2. API Key / Auth Configuration
- Store the manage.fgn.gg API credentials as a secret (`MANAGE_FGN_API_KEY` or similar)
- The edge function reads this secret to authenticate with manage.fgn.gg

### 3. New Provider Page: `/provider/subscribers`
A UI page in the existing provider admin sidebar that displays subscriber data fetched from manage.fgn.gg:
- **Subscriber list** — shows verified subscribers for the provider's tenant
- **Verification status** — shows pending/completed verifications
- **Sync button** — triggers a fresh pull from manage.fgn.gg

### 4. Sidebar and Routing Updates
- Add "Subscribers" link to `ProviderSidebar.tsx`
- Add route in `App.tsx`

## Before We Proceed

There are a few things I need from you to move forward:

1. **Does manage.fgn.gg have API endpoints we can call?** (e.g., REST endpoints for listing subscribers, checking verification status by provider). If not, we would need to add an API layer to that app first.

2. **What authentication does manage.fgn.gg use?** (API key, shared secret, or something else for server-to-server calls)

3. **What data should flow between the apps?** For example:
   - Subscriber verification status
   - Access codes generated
   - Provider/ISP configuration
   - Or just a simple "is this user a verified subscriber?" check

Once these are answered, I can write the exact edge function, hook, and UI code to wire it all together. The approach keeps subscriber verification centralized in manage.fgn.gg while giving provider admins in this app full visibility into their subscribers.

## Technical Architecture

```text
+---------------------+          +----------------------+
|   This App          |          |  manage.fgn.gg       |
|   (Gaming Platform) |          |  (Subscriber Mgmt)   |
|                     |          |                      |
|  Provider Admin UI  |          |  NISC / GLDS APIs    |
|        |            |          |       |               |
|  useProviderSubs()  |          |  Verification Logic  |
|        |            |          |       |               |
|  Edge Function:     |  HTTPS   |  API Endpoints       |
|  proxy-manage-api  --------->  |  (needs confirmation) |
|                     |          |                      |
+---------------------+          +----------------------+
```

## Files to Create
- `supabase/functions/proxy-manage-api/index.ts` -- edge function proxy
- `src/hooks/useProviderSubscribers.ts` -- data fetching hook
- `src/pages/provider/ProviderSubscribers.tsx` -- subscriber list page

## Files to Modify
- `src/components/provider/ProviderSidebar.tsx` -- add Subscribers nav item
- `src/App.tsx` -- add subscriber route

