## Audit: current state of "Subscriber Banner" / page builder

The Branding & Banner page today jams a full multi-section web-page editor (`WebPageEditor`) into a single card labeled "Subscriber Banner". Tenants can Add Section from a catalog of 8 block types (`SECTION_TYPES` in `src/hooks/useWebPages.ts`): **hero, text_block, image_gallery, cta, embed_widget, banner, video, featured_events**. All 8 render inline stacked above every player-portal page via `TenantBannerSlot`.

Problems this creates:

1. **Naming is wrong.** The card says "Subscriber Banner" but the tool is a full page builder. Tenants add a hero + gallery + CTA and are surprised it all shows up as a "banner" strip on every portal page.
2. **One destination, one purpose.** There is exactly one `is_tenant_banner=true` page per tenant. There is no way to build additional branded landing pages, promo pages, event pages, or an "Esports Service" hub — even though `web_pages` already supports many pages per tenant (only the banner flag is unique).
3. **Editor UX is builder-centric, not marketer-centric.** No templates, no starting points, no preview of where the block will appear (portal-wide banner vs standalone page), no per-section visibility rules, no scheduling, no A/B, no draft vs published for individual sections. Section editors are dense forms with raw fields (hex colors, embed HTML, YouTube URLs) instead of guided pickers.
4. **Library disconnect.** Media Library and Widget Library exist and `MediaPickerDialog` works, but there is no way to save a whole finished **section** or **page** back to a shared library (common or tenant-specific) for reuse. Universal Marketing Assets ship images/embeds — not composable page blocks.
5. **No agent surface.** `src/lib/mcp/index.ts` and `supabase/functions/_shared/mcp-tools/` expose zero tools for `web_pages` / `web_page_sections`. The marketing agent literally cannot create, edit, or propose a banner or landing page today.
6. **Section catalog gaps.** Missing block types that a real esports-service landing page needs: **feature grid, pricing/tiers, FAQ, testimonials, contact/inquiry form, subscriber gate, prize showcase, leaderboard embed, tournament card row, social feed, sponsor strip**.
7. **Publishing story is unclear.** `is_published` toggles hide the whole page; there is no schedule window, no unpublish date, no per-audience gating (all-subscribers vs specific tenant code vs guest), and no analytics on views/clicks.

## Proposed direction (plan, not implementation)

### A. Rename and split the destination

Rename the section from "Subscriber Banner" to **"Branded Pages"** (plural). Keep the single always-on banner as one entry in the list, but expose the underlying page collection:

- **Portal Banner** — the existing `is_tenant_banner=true` row, always injected via `TenantBannerSlot`. Marked with a "Live across portal" pill.
- **Landing Pages** — additional `web_pages` rows scoped to the tenant, each with a public URL under `/pages/:tenantSlug/:pageSlug` (route already exists in `App.tsx`).
- **Templates** — start-from-template gallery (see D).

The tab lives inside Branding & Banner (as today) but with a left-column list of pages and a right-column editor, so tenants understand there is more than one destination.

### B. Marketer-friendly editor pass

Keep `WebPageEditor` as the engine; layer on:

1. **Purpose picker on Add Section** — group blocks by intent (Hero & Above-the-fold / Content & Story / Conversion / Community & Live Data / Embeds). `AddSectionDialog` already has icons; regroup and add short "when to use" copy.
2. **Guided pickers instead of raw fields** — replace hex text inputs with the existing `ColorPicker`; replace YouTube URL field with a paste-URL-that-auto-embeds helper; add a "video from Media Library" branch; add an emoji/icon picker for CTA and feature blocks.
3. **Section presets** — each block ships 2–3 pre-styled presets ("Dark hero with CTA", "Split hero with image", "Minimal announcement banner") that pre-fill `config` including tenant brand colors (the hook already reads `tenantBranding`).
4. **Preview context switcher** — toggle "Preview as portal banner" vs "Preview as standalone page" so tenants see the actual render surface.
5. **Draft vs published per page** — surface `is_published` prominently with last-published-at timestamp and a "Revert to last published" action.
6. **Scheduling** — add `publish_at` / `unpublish_at` columns to `web_pages`; if set, `TenantBannerSlot` and public page view respect the window. Show a countdown badge in the editor list.

### C. New / missing section types

Add to `SECTION_TYPES`: **feature_grid**, **pricing_tiers**, **faq**, **testimonials**, **sponsor_strip**, **leaderboard_embed**, **tournament_row**, **contact_form** (writes to `provider_inquiries`-style table). Each gets a `SectionEditor` case and a `SectionPreview` case using existing shadcn primitives.

### D. Template & shared library

Two library surfaces, both storage-only (no runtime coupling):

1. **Common templates** — a small curated set (Esports Service Home, Tournament Landing, Coach Sign-up, Prize Reveal) stored as JSON section arrays under a new `web_page_templates` table with `is_universal boolean`, `preview_image_url`, `category`, `sections jsonb`. Available to every tenant via "Start from template" in the Branded Pages list.
2. **Tenant-saved blocks** — from any section, "Save block to library" persists a row in `tenant_saved_blocks` (`tenant_id`, `label`, `section_type`, `config jsonb`, `preview_image_url nullable`). Appears in Add Section as an extra "My Saved Blocks" group.

Both tables need RLS + GRANT following project conventions; templates are anon-readable, saved blocks are tenant-member-only.

### E. Marketing agent integration

Extend the MCP surface (`src/lib/mcp/index.ts` + `supabase/functions/_shared/mcp-tools/`) with these tools, all tenant-scoped and requiring an explicit `tenant_id` per the resolution rule established in Phase 2:

| Tool | Purpose | Approval |
|------|---------|----------|
| `list_branded_pages` | Enumerate the tenant's `web_pages` with `is_tenant_banner`, `is_published`, section counts | none |
| `list_page_templates` | Return common + universal templates for the tenant | none |
| `propose_branded_page` | Create a **draft** `web_pages` row with a section array from a template or from block-by-block config; returns page id and preview URL | none (draft only, `is_published=false`) |
| `update_branded_page_sections` | Replace / append / reorder sections on a draft page | none for drafts |
| `publish_branded_page` | Flip `is_published=true`, optionally set `publish_at` / `unpublish_at` | **needsApproval=true** |
| `propose_portal_banner_update` | Draft-edit the `is_tenant_banner=true` row's sections (never auto-publishes) | **needsApproval=true** because it's site-wide |
| `save_block_to_library` | Persist a section to `tenant_saved_blocks` | none |

Agent workflow: the marketing agent picks a template or composes blocks, calls `propose_branded_page` to stash a draft, notifies tenant admins via the existing `enqueue_marketing_notification` path (new category `branded_page_draft`), and lets a human hit Publish. Live portal banner edits always require human approval.

Update the seeded `marketing_agent` prompt (bump to v3, atomic activate, retain v2 in history) to add a Core workflow step: "When a tenant asks for a landing page, campaign hub, or updated portal banner, call `list_page_templates` and `propose_branded_page` (never `publish_branded_page` without explicit human approval)."

### F. Notifications & audit

Reuse the Phase 1 pipeline. Add categories to `get_marketing_notification_recipients`:

- `branded_page_draft` — email+in-app to admin/manager, in-app-only to marketing.
- `branded_page_published` — in-app to all three roles.
- `portal_banner_change_requested` — email+in-app to admin/manager (site-wide change is high-signal).

All entries land in `notifications` with `related_kind='web_page'` and `related_id=page.id` for RLS-scoped audit.

## Technical details

- **DB:** new columns `web_pages.publish_at`, `web_pages.unpublish_at`; new tables `web_page_templates`, `tenant_saved_blocks`; each with GRANTs + RLS per project conventions. `web_page_sections` unchanged.
- **Editor:** additive changes to `SECTION_TYPES`, `AddSectionDialog` (grouping + descriptions), `SectionEditor` (new cases + preset dropdown), `SectionPreview` (new cases). `TenantBranding.tsx` gains a two-column layout with page list + editor slot; keeps Logo / Colors / Company Info cards on top.
- **Public render:** `TenantBannerSlot` respects `publish_at` / `unpublish_at`; `WebPageView` route already handles multi-page rendering.
- **MCP tools:** implement in `supabase/functions/_shared/mcp-tools/branded-pages.ts`; register in both `mcp` and `agent-mcp` functions; enforce tenant guard identically to Phase 2 tools.
- **Prompt:** insert Marketing Pages workflow step in `agent_prompts` v3; atomic activate; keep v2.

## Out of scope

- No visual redesign of the Logo / Colors / Company Info cards (Phase-1-adjacent change already shipped).
- No changes to Media Library, Widget Library, or Universal Marketing Assets pipeline.
- No analytics dashboard for page views — flag as a follow-up.

## Verification checklist (for the build phase)

1. Branded Pages list shows the existing banner + any additional pages; new page can be created from blank or from a template.
2. New section types render in editor and preview.
3. Scheduling: setting a future `publish_at` hides the page until the window opens; unpublish window ends visibility.
4. Agent can call `propose_branded_page` and produce a draft; `publish_branded_page` and `propose_portal_banner_update` gate on human approval.
5. Notifications fire with correct categories and land in `notifications` with `related_kind='web_page'`.
6. `list_platform_templates` and new `list_page_templates` both require explicit `tenant_id`.
7. RLS: anon can read published pages; only tenant members can see drafts and saved blocks.
