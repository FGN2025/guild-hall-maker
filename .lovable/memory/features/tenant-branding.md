---
name: tenant-branding
description: Per-tenant logos, brand colors, and a custom subscriber-facing banner page. Visible to tenant staff and email-linked subscribers; FGN fallback for everyone else.
type: feature
---
Tenant branding (logo + colors + custom banner) is delivered to two audiences:
1. **Tenant staff** — resolved via `tenant_admins` (existing).
2. **Linked subscribers** — `tenant_subscribers.user_id` is auto-stamped on profile insert by trigger `trg_claim_subscriber_on_profile` calling `claim_subscriber_records()`. Email match (case-insensitive) against `auth.users.email`.

`get_user_tenant(uuid)` returns the active tenant id (admin priority over subscriber). `useUserTenantBranding` calls it, fetches `tenants` row + the published `web_pages` row where `is_tenant_banner = true` + its sections.

`TenantBrandingProvider` (in `AppLayout`) sets `--tenant-primary` / `--tenant-accent` HSL vars on `<html>`. `<TenantBannerSlot />` renders banner sections via existing `<SectionPreview>` above every page outlet.

Logo swap: `Navbar.tsx` and `AppSidebar.tsx` show the tenant logo + "Powered by FGN" line when branding is active; otherwise FGN logo.

Editor: tenants manage the banner at `/tenant/branding` — the page auto-creates the banner web_page with `is_tenant_banner=true, is_published=true` on first visit and reuses the existing `WebPageEditor`. Unique partial index `one_banner_per_tenant` enforces one banner per tenant.

RLS: `web_pages` are anon-readable when published (existing policy); banner gating is application-layer (only fetched when `get_user_tenant` returns a tenant). Subscribers can read their own row via the `user_id = auth.uid()` SELECT policy.
