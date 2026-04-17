

## Tenant Branding: Logo + Custom Banner Plan

### Goal
When a logged-in **subscriber** of a tenant (or a tenant staff member) browses the player portal, they see their tenant's **logo** in the navbar/sidebar and a **custom banner** (built in our existing Web Page editor) at the top of core pages. Guests and unaffiliated users see the default FGN branding.

### What already exists (reuse, don't rebuild)
- `tenants` table has `logo_url`, `primary_color`, `accent_color` ✅
- `TenantLayout` already applies brand colors as CSS vars (admin portal only) ✅
- `web_pages` + `web_page_sections` editor + `SectionPreview` already supports `hero`, `banner`, `text_block`, `cta`, `featured_events`, etc. ✅ — perfect for "build banner in our editor"
- `tenant_subscribers` table already maps customers to tenants ✅
- `PageHero` / `PageBackground` components exist for per-page imagery ✅

### Architecture

```text
User logs in
   │
   ▼
Resolve "active tenant" for this user:
   1. tenant_admins.user_id  → staff
   2. tenant_subscribers (match by email/zip) → subscriber
   3. else → none (default FGN branding)
   │
   ▼
TenantBrandingContext provides:
  { tenant, logoUrl, primaryColor, accentColor, bannerPageSlug }
   │
   ├─► Navbar/AppSidebar logo swap (with FGN fallback)
   ├─► CSS vars --tenant-primary / --tenant-accent on <html>
   └─► <TenantBannerSlot pageSlug="dashboard"/> at top of pages
```

### Database changes (one migration)

1. **Subscriber linking** — add nullable `user_id` to `tenant_subscribers` so we can match a logged-in user to their tenant deterministically (auto-link on login by email match).
   ```sql
   ALTER TABLE tenant_subscribers ADD COLUMN user_id uuid REFERENCES auth.users(id);
   CREATE INDEX ON tenant_subscribers(user_id);
   ```
2. **Per-tenant banner pages** — extend `web_pages` so a tenant can mark one page as their "branded banner" set:
   ```sql
   ALTER TABLE web_pages ADD COLUMN is_tenant_banner boolean DEFAULT false;
   -- Partial unique: only one active banner page per tenant
   CREATE UNIQUE INDEX one_banner_per_tenant ON web_pages(tenant_id) 
     WHERE is_tenant_banner = true AND is_published = true;
   ```
3. **RLS** — banner pages are readable by:
   - tenant staff (existing policy)
   - users in `tenant_subscribers` for that tenant
   - NOT public anon, NOT other tenants' subscribers
4. **Helper function**:
   ```sql
   CREATE FUNCTION get_user_tenant(_user_id uuid) RETURNS uuid
   -- Returns tenant_id from tenant_admins OR tenant_subscribers, else NULL
   ```

### New code

**Hook** `src/hooks/useUserTenantBranding.ts`
- Calls `get_user_tenant(auth.uid())`, fetches tenant row + banner web_page + sections.
- Returns `{ tenant, bannerSections, isLoading }`. Cached 5 min.

**Provider** `src/contexts/TenantBrandingContext.tsx`
- Wraps `<AppLayout>`; applies `--tenant-primary/--tenant-accent` CSS vars to `<html>` (mirrors existing TenantLayout logic).

**Component** `src/components/branding/TenantBannerSlot.tsx`
- Renders banner sections via existing `<SectionPreview>` if branding active; nothing otherwise.
- Drop into `AppLayout` `<main>` top, above `<Outlet/>`.

**Navbar/Sidebar logo swap**
- `Navbar.tsx` (line 60) and `AppSidebar.tsx`: if `branding.tenant?.logo_url`, render tenant logo + tenant name; else FGN logo. Co-brand pattern: "POWERED BY FGN" small text below tenant logo.

**Tenant editor entry point**
- In `TenantSidebar`, add nav item **"Branding & Banner"** → reuses existing `WebPageEditor` filtered to `is_tenant_banner = true` page (auto-create if missing). No new editor needed.
- "Branding" tab also shows current logo (already editable in TenantSettings) and a live preview of how the player portal looks with their banner.

### Auto-link subscribers to users
When a user signs in/registers, a trigger or `claim_subscriber_record()` function matches their auth email to `tenant_subscribers.email` and stamps `user_id`. This is what powers branding visibility.

### Visibility rules summary

| Viewer | Logo | Banner | Colors |
|---|---|---|---|
| Tenant staff | Tenant | Tenant | Tenant |
| Linked subscriber | Tenant (co-branded) | Tenant | Tenant |
| Other logged-in user | FGN | None | FGN |
| Guest | FGN | None | FGN |
| Platform admin | Selected tenant (existing switcher) | Selected | Selected |

### Out of scope (can follow up)
- Per-page banner overrides (one banner page per tenant for v1)
- Custom fonts per tenant
- Tenant-specific email templates

