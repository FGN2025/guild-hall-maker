# Dual-Lane Marketing Agent Plan

Architecture principle: agent automates the marketing role using the SAME processes and output shapes as the human tools. Two lanes converge in the same editor + approval gate:
- **Lane 1 (calendar)** — deterministic composition from published events (mirrors Promo from Event).
- **Lane 2 (creative)** — existing agent path with externally generated visuals.

Both lanes produce identical `marketing_campaigns` + `tenant_marketing_assets` shapes. Nothing in this work touches the pending Acme scheduled posts — all changes are additive columns, new tool, new mode; existing dispatcher, RLS, and queue remain untouched.

---

## Feature 1 — Shared Promo Composer

**Extract** the layout currently living in `TenantPromoPickerDialog` (`buildTenantEventPromo` + `renderPromoToBlob`) into a pure layout module and a server render.

**Files**
- `src/lib/promo/composePromoLayout.ts` — shared layout spec: takes `{ event, tenant, format, beatLabel }` → returns a declarative scene (background url, gradient stops, text blocks with x/y/font-size/color, accent bar coords). No DOM, no canvas. Consumed by both browser (dialog) and edge (MCP).
- `supabase/functions/_shared/promo/renderPromo.ts` — server renderer.
- `supabase/functions/_shared/mcp-tools/compose-event-promo.ts` — new MCP tool.
- `src/components/marketing/TenantPromoPickerDialog.tsx` — refactor to consume `composePromoLayout` for its client canvas render (unchanged UX).

**Deno rendering approach**: `@resvg/resvg-wasm` + a small SVG builder. Rationale: pure-WASM, deterministic, no font/DOM deps, tiny cold start, works in Supabase Edge Runtime; `satori` requires React and full webfont buffers which we're explicitly out-of-scope for. Background image is fetched server-side and inlined as an `<image href="data:...">` node so the render is self-contained. Tenant primary color comes from `tenants.primary_color`; fonts stay on system stack via SVG `font-family="Inter, system-ui, sans-serif"` embedded as text (no webfont buffer needed — resvg falls back to the bundled DejaVu, acceptable for MVP; flagged below).

**Tenant color/font handling**: layout reads `tenant.primary_color` (fallback `#22d3ee` cyan), passes it into gradient + accent bar. Font is Inter system stack today; if we want brand fonts later, load a single WOFF2 into resvg via `fontBuffers` — flagged as follow-up, not in scope.

**MCP tool `compose_event_promo`**
- Params: `tenant_id` (uuid, required), `tournament_id` XOR `event_id` (exactly one required — validated), `format` (enum `portrait`|`square`|`landscape`, default `portrait` 1080×1350), `beat_label?` (string, e.g. "Announce", "Reminder"), `campaign_id?` (uuid), `idempotency_key?`.
- Behavior: fetches event, fetches tenant brand, calls `composePromoLayout`, renders PNG via resvg, uploads to `tenant-marketing/{tenant_id}/promo-{event_id}-{beat}-{hash}.png` in the `app-media` bucket, then re-uses the exact `attach_tenant_asset_draft` ingestion path so RLS, `is_published=false`, `agent_source`, `proposed_by`, `campaign_id` linkage, and pending-draft notifications are all identical to Lane 2.
- Persists overlay config (see Feature 2) so the resulting asset is editable.
- Zero external generation cost — layout + resvg only.

---

## Feature 2 — Overlay Persistence (Editability Fix)

**Schema (migration)** on `tenant_marketing_assets`:
- `overlay_config jsonb` — array of `TextOverlay | LogoOverlay | ShapeOverlay` from `src/hooks/canvas/canvasTypes.ts`, plus `{ canvas: { format, width, height } }` wrapper.
- `background_url text` — clean base image (no overlays baked in). For composer output this is the event cover; for uploaded assets it equals `url` on first save.

Grants + RLS unchanged (new columns inherit table policies).

**Client**
- `AssetEditorDialog` — on open, if `overlay_config` present, hydrate `useCanvasEditor` state from it AND use `background_url` as the base layer instead of the flattened `url`. On save, re-flatten to PNG → update `url`, persist current overlay array + `background_url` to `overlay_config`. Assets without config load as today (single flattened layer).
- `useTenantMarketingAssets.uploadAsset` gains optional `overlay_config` + `background_url`.

**MCP**
- `attach_tenant_asset_draft` gains optional `overlay_config` + `background_url` params (both nullable, back-compat).
- `compose_event_promo` writes both fields so composer output opens in the editor with the event title, date, prize as individually editable text layers.

---

## Feature 3 — Monthly Calendar Seed

**Schema**
- `agent_run_limits` gains `turn_cap int` per `mode` row. Default `40`; seed the `monthly_calendar_seed` row with `turn_cap = 100`. `agent-run` reads cap from limits row instead of hard-coded 40.
- `tenants.marketing_seed_density text default 'standard'` with check `('light','standard','full')`.

**New agent-run mode** `monthly_calendar_seed`
- `AgentLaunchCard` mode `Select` gets a new option that reveals a month picker (`<input type="month">`, defaults to next month). Payload: `{ mode: 'monthly_calendar_seed', month: 'YYYY-MM' }`.
- Density selector visible in the same card (reads/writes `tenants.marketing_seed_density`).
- Prompt content supplied at implementation time; runner just loads `agent_prompts` row `marketing_agent_calendar_seed` v1.

**Beat structure per density**
| Density | Per tournament | Per game night | Monthly |
|---|---|---|---|
| light | 1 post (day-of) | 1 post (day-of) | 1 kickoff |
| standard | announce + reminder + day-of | announce + day-of | 1 kickoff |
| full | announce + reminder + day-of + recap | announce + reminder + day-of | 1 kickoff + mid-month recap |

**Idempotency**: each proposed asset + campaign + scheduled post uses key `seed:{tenant_id}:{yyyy-mm}:{event_id}:{beat}` (kickoff uses `event_id=kickoff`). Re-runs no-op via existing `idempotency_key` unique constraints on `marketing_campaigns` / `scheduled_posts` — verified against current schema.

**Kickoff post**
- New MCP read tool `get_calendar_image({ year, month })` → returns `{ url, storage_path, tenant_id? }` from `calendar_monthly_images` or `null` gracefully.
- Runner calls it, and if non-null passes the URL as `source_url` to `attach_tenant_asset_draft` (same ingestion path Lane 2 uses for external URLs). No calendar authoring, no new bucket.

**Tenant scoping of platform events**: tournaments have no `tenant_id`, acceptable for this pass — seed treats every published tournament in the month as in-scope for every tenant. **Cheap filtering hook flagged**: `tournaments` already has an optional `tenant_id` column (nullable). If populated, seed will prefer `tenant_id IS NULL OR tenant_id = :tenant`; if null everywhere, behavior unchanged. Documenting only; no data backfill.

---

## Feature 4 — Convergence Cleanup

**(a) Legacy `useMarketingCampaigns.createCampaign`** — upgrade to require `tenant_id` (from `useTenantAdmin`), default `target_platforms: []`, `status: 'draft'`, accept `source_tournament_id` / `source_event_id`. Removes the divergences catalogued in the discovery report. `MarketingCampaign` type gains those fields. Legacy admin `AdminMarketing` callers already pass a tenant context.

**(b) Promo → Campaign bridge** — `TenantPromoPickerDialog` gets a post-save "Create campaign from this promo" secondary action (checkbox default off). When checked, after asset save it calls the upgraded `createCampaign` with `{ tenant_id, title: event.name, source_tournament_id | source_event_id, target_platforms: [] }` then updates the new asset row with `campaign_id`.

**(c) Agent Drafts UX for seed months** — `TenantMarketingDetail` drafts list gains grouping: `groupBy: 'campaign'` toggle, week subheadings (`ISO week`), per-week count badge, multi-select checkboxes + "Approve selected" bulk action calling the existing approve mutation in a loop with a single toast summary. Per-item rejection with `feedback_note` unchanged.

---

## Out of Scope (explicit)
Editor native AI generation, auto-publish, video, non-Facebook channels, calendar authoring, webfont loading for the editor.

---

## Migrations (single file, additive)
1. `alter table tenant_marketing_assets add column overlay_config jsonb, add column background_url text;`
2. `alter table agent_run_limits add column turn_cap int not null default 40;`
3. `insert into agent_run_limits(mode, turn_cap, daily_cap, monthly_cap) values ('monthly_calendar_seed', 100, 2, 10) on conflict (mode) do update set turn_cap = excluded.turn_cap;`
4. `alter table tenants add column marketing_seed_density text not null default 'standard' check (marketing_seed_density in ('light','standard','full'));`
5. `insert into agent_prompts(name, version, content, is_active) values ('marketing_agent_calendar_seed', 1, '<supplied at build>', true);`

No RLS, grant, or trigger changes. No touch to `scheduled_posts` dispatcher, queue, or Acme pending rows.

---

## Verification

1. **Composer parity** — render the same event through `TenantPromoPickerDialog` and `compose_event_promo`; diff PNGs pixel-by-pixel, must match (allow ≤1% AA tolerance).
2. **Editability** — reopen a composer-produced asset in `AssetEditorDialog`; title/date/prize appear as separate editable text layers. Edit title → save → verify `url` PNG changes AND a subsequently-approved scheduled post dispatches the new image.
3. **Seed correctness** — run `monthly_calendar_seed` for July against Acme (standard density): drafts appear grouped per campaign with correct beats for every tournament + game night that month; re-run produces zero new rows; kickoff draft carries the July poster from `calendar_monthly_images`.
4. **Density counts** — light/standard/full each produce the expected count matrix above on a fixed test month.
5. **Turn cap** — a standard-density month for a busy tenant completes within 100 turns; `agent_runs.turns_used ≤ 100`; kill switch (`agent_launches_enabled=false`) still blocks.
6. **Human campaign shape** — create a campaign via `useMarketingCampaigns.createCampaign`; row has `tenant_id`, `target_platforms=[]`, `status='draft'`, and accepts source FKs.
7. **Lane 2 regression** — existing `create_campaign_draft` + `attach_tenant_asset_draft` (external URL) flow unchanged; smoke-test one draft end-to-end.
8. **Non-disturbance** — pre/post diff `scheduled_posts where tenant_id = Acme and status='scheduled'`: identical row set and `scheduled_at` values.

Awaiting approval before implementation.