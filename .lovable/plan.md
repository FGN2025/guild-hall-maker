

## Plan: Add CSV & PDF Export to All Player/User List Pages

### Pages Requiring Export Buttons

There are **4 pages** with tabular user/player data that need export functionality:

| Page | Route | Data Source | Roles with Access |
|------|-------|-------------|-------------------|
| Admin Users (Current + Legacy tabs) | `/admin/users` | `useAdminUsers`, `useLegacyUsers` | Admin |
| Tenant Players | `/tenant/players` | `useTenantPlayers` | Tenant Admin, Manager, Marketing |
| Tenant Leads | `/tenant/leads` | `useTenantLeads` | Tenant Admin, Manager, Marketing |
| Tenant Subscribers | `/tenant/subscribers` | `useTenantSubscribers` | Tenant Admin, Manager |

### Existing Pattern

The project already has a proven export pattern in `src/lib/exportSeasonStats.ts`:
- **CSV**: Build CSV string → create Blob → trigger download via hidden `<a>` element
- **PDF**: Build styled HTML → open print window → browser print-to-PDF

The `exportDocuments.ts` file has shared print styles (`PRINT_STYLES`) and an `openPrintWindow` helper that can be reused.

### Changes

**1. `src/lib/exportUserData.ts`** (new file)

Create a shared utility with these functions:
- `exportUsersCSV(rows, filename)` — Takes an array of objects with standardized column keys, builds CSV, triggers download
- `exportUsersPDF(rows, title, filename)` — Takes same data, builds HTML table with `PRINT_STYLES`, opens print window
- Both functions accept a `columns` config array so each page can define which fields to include

**2. `src/pages/admin/AdminUsers.tsx`**

Add two export buttons (CSV, PDF) to the header area next to the search/filter controls, one set per tab:
- **Current Users tab**: Export columns — Display Name, Gamer Tag, Discord Username, Discord ID, Role, Tenant, Email Status, Created
- **Legacy Users tab**: Export columns — Username, Email, Provider, Created

**3. `src/pages/tenant/TenantPlayers.tsx`**

Add CSV + PDF export buttons next to the existing search input. Export columns: Name, Gamer Tag, Email, Invite Code, Status, Registered.

**4. `src/pages/tenant/TenantLeads.tsx`**

Add CSV + PDF export buttons. Export columns: Email, Display Name, Status, Created.

**5. `src/pages/tenant/TenantSubscribers.tsx`**

Add CSV + PDF export buttons. Export columns: Account #, Name, Email, Phone, ZIP, Service Status, Plan, Source.

### Level of Effort: Low-Medium
- 1 new utility file (~80 lines)
- 4 page files updated (add ~15-20 lines each for import + buttons)
- No database or RLS changes needed — all data is already fetched client-side

