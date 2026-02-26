

## Tenant-Scoped Marketing Assets with Role-Based Access

### Overview
Introduce a new `tenant_marketing_assets` table where tenants store their customized/branded versions of master marketing assets. Access is restricted to users with the **marketing** or **admin** role for that specific tenant, plus platform Super Admins.

The master templates live in the existing `marketing_assets` table (managed by Super Admins). Tenants pick a master asset, customize it (brand overlay -- future step), and save the result to the tenant-scoped table.

---

### 1. Database: New `tenant_marketing_assets` Table

```sql
CREATE TABLE public.tenant_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_asset_id uuid REFERENCES public.marketing_assets(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  url text NOT NULL,
  label text NOT NULL DEFAULT 'Default',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_marketing_assets ENABLE ROW LEVEL SECURITY;
```

**RLS Policies** -- uses existing `is_tenant_admin` and `is_tenant_member` security-definer functions, plus a new helper:

```sql
-- Helper: check if user has admin or marketing role for a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_marketing_member(
  _tenant_id uuid, _user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_admins
    WHERE tenant_id = _tenant_id
      AND user_id = _user_id
      AND role IN ('admin', 'marketing')
  )
$$;

-- Super Admins: full access
CREATE POLICY "Super admins full access"
  ON public.tenant_marketing_assets FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Tenant admin/marketing: full CRUD on own tenant's assets
CREATE POLICY "Tenant admin and marketing can manage"
  ON public.tenant_marketing_assets FOR ALL
  USING (is_tenant_marketing_member(tenant_id, auth.uid()))
  WITH CHECK (is_tenant_marketing_member(tenant_id, auth.uid()));
```

---

### 2. Update Marketing Role Access in Sidebar

In `TenantSidebar.tsx`, add `'marketing'` to the Marketing nav item's roles array so marketing-role users can see and access the marketing pages:

```typescript
{ to: "/tenant/marketing", label: "Marketing", icon: Megaphone, roles: ['admin', 'manager', 'marketing'] },
```

---

### 3. New Hook: `useTenantMarketingAssets`

Create `src/hooks/useTenantMarketingAssets.ts` that provides:

- **List** tenant-scoped assets (filtered by tenant_id from `useTenantAdmin`)
- **Upload** a new customized asset (stores file in `app-media` under `tenant-marketing/{tenantId}/...`, inserts row)
- **Delete** an asset
- **Toggle publish** status
- Optionally link to the `source_asset_id` (the master template it was derived from)

---

### 4. New Page: Tenant Marketing Assets (`TenantMarketingAssets.tsx`)

Create `src/pages/tenant/TenantMarketingAssets.tsx`:

- Shows a grid of the tenant's own customized marketing assets
- Upload button to add new assets (with label, optional notes)
- "Pick from Library" button that opens a dialog showing published master `marketing_assets` -- selecting one copies the URL as `source_asset_id` and opens an upload flow for the branded version
- Publish/unpublish toggle per asset
- Delete button
- Only accessible to `admin` and `marketing` tenant roles

---

### 5. Route and Navigation

- Add route `/tenant/marketing/assets` in `App.tsx` wrapped in `<TenantRoute>`
- Add a new sidebar item in `TenantSidebar.tsx`:
  ```typescript
  { to: "/tenant/marketing/assets", label: "My Assets", icon: ImageIcon, roles: ['admin', 'marketing'] }
  ```

---

### 6. Update Tenant Marketing Detail Page

In `TenantMarketingDetail.tsx`, add a "Save to My Assets" button next to the existing "Download" button. This copies the master asset into the `tenant_marketing_assets` table linked to the tenant, so they can track which templates they've used.

---

### Summary of Changes

| Item | Type | Description |
|------|------|-------------|
| `tenant_marketing_assets` table | DB Migration | New table with RLS for tenant-scoped branded assets |
| `is_tenant_marketing_member()` | DB Function | Security-definer helper for admin+marketing role check |
| `useTenantMarketingAssets.ts` | Hook | CRUD operations for tenant marketing assets |
| `TenantMarketingAssets.tsx` | Page | UI for managing tenant's own branded assets |
| `App.tsx` | Route | Add `/tenant/marketing/assets` route |
| `TenantSidebar.tsx` | Nav | Add "My Assets" link, grant marketing role access to Marketing |
| `TenantMarketingDetail.tsx` | UI Update | Add "Save to My Assets" action |

