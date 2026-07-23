
# Agent Drafts: Asset review + event-linked campaigns

Two feature additions plus two bundled fixes (bucket consistency, `list_platform_templates` column).

## 1. Asset review in the Agent Drafts panel

Today asset rows render a small inline `<img>` and there's no way for a reviewer to open the full-size file. Scheduled-post and campaign cards have no way to see the picked/linked asset at all.

Change `src/components/tenant/AgentDraftsPanel.tsx`:

- Add an **"Open asset"** button on every draft card that has an associated asset:
  - `kind === "asset"` → the row itself.
  - `kind === "scheduled_post"` → the row's `image_url` plus any `tenant_marketing_assets` linked via the shared `campaign_id`.
  - `kind === "campaign"` → any `tenant_marketing_assets` linked via `campaign_id`, each openable.
- Add `src/components/tenant/AssetReviewDialog.tsx`:
  - Renders full-size image with metadata (file name, label/format, natural dimensions, `source_url`, `campaign_id`, `is_published`, `agent_source`, `notes`).
  - Actions: "Open in new tab", "Copy source URL".
  - URL resolution follows the bucket decision in §3 — signed URLs if private, direct `url` if public. Read-only; approve/reject stay on the card.
- One follow-up query in the panel keyed by the collected `campaign_id`s hydrates linked assets so the dialog opens without another round-trip.

No approval/rejection logic changes.

## 2. Agent can start a campaign from an existing event, or start new

`create_campaign_draft` has no event linkage today, so the agent always "starts new." Add explicit optional linkage.

### Schema (folded into the same migration as §3 and §4)

`marketing_campaigns`:
- add `source_event_id uuid null` — FK `tenant_events(id) on delete set null`
- add `source_tournament_id uuid null` — FK `tournaments(id) on delete set null`
- CHECK: at most one of the two is set
- indexes on both columns

### MCP tool changes

- `create_campaign_draft` — accept optional `source_event_id` / `source_tournament_id` (mutually exclusive → clear tool error if both). Persist on insert. Description spells out: "Pass `source_event_id` or `source_tournament_id` from `list_upcoming_events` to build off an existing event, or omit both to start new."
- `update_campaign_draft` — accept the same two optional fields (null clears the link).
- `list_pending_agent_drafts` — include both fields in the campaign select.
- `list_upcoming_events` — unchanged.

### UI

Campaign cards render a "Linked to: <event name>" chip when either id is set (batched lookup). Same chip in the review dialog header.

### System-prompt guidance

Update `.lovable/plan.md` § "Claude connection guidance": "When proposing a campaign, first call `list_upcoming_events`; if a relevant event exists, pass its id. Only omit both when the campaign is intentionally standalone."

## 3. Bucket visibility — settle now (Flag 1)

**Confirm whether `tenant-marketing` is public or private and make the whole pipeline consistent.** Today `attach_tenant_asset_draft` stores public-shape URLs (`/object/public/tenant-marketing/...`) and they render, which means the bucket is currently **public**. The dialog design assumed private + signed URLs. Both can't stay true. If we later flip the bucket private, every `scheduled_posts.image_url` and `tenant_marketing_assets.url` already stored breaks — including at cron dispatch time.

Decision baked into this same pass — **keep `tenant-marketing` public** because:
- The dispatcher already publishes images to external social platforms, which need publicly fetchable URLs.
- Stored URLs across `scheduled_posts.image_url` and `tenant_marketing_assets.url` are already public-shape; no backfill needed.
- Reviewer preview needs no auth round-trip.

Consistency work in this pass:
- Confirm bucket via `supabase--storage_update_bucket("tenant-marketing", public=true)` (idempotent; no-op if already public). If workspace policy blocks public buckets and the call fails, flip the plan: bucket private, `attach_tenant_asset_draft` and the dispatcher switch to signed URLs (7-day TTL, refreshed at send), a follow-up migration rewrites existing rows to freshly signed URLs, and `AssetReviewDialog` mints signed URLs. Do not proceed with a mixed state.
- `AssetReviewDialog` uses the stored `url` directly (public path) in the public-bucket outcome; adds a `createSignedUrl(file_path, 600)` fallback only if a load error fires.
- No dispatcher change needed under the public outcome. Under the private fallback, the dispatcher call site (existing scheduled-post cron worker) refreshes a signed URL immediately before posting.

## 4. Fix `list_platform_templates` — bundle now (Flag 2)

`marketing_assets` has no `format` column (columns: `id, campaign_id, file_path, url, label, display_order, width, height, created_at`). The current `list_platform_templates` tool selects `format` and errors. Fix in this deploy:

`src/lib/mcp/tools/list-platform-templates.ts` — change `.select("id, campaign_id, format, file_url, label, created_at")` to `.select("id, campaign_id, file_path, url, label, width, height, display_order, created_at")`. No schema change; this is a select typo.

## Files

- `supabase/migrations/<new>.sql` — `marketing_campaigns.source_event_id` + `source_tournament_id`, FKs, check, indexes.
- Bucket confirmation via `supabase--storage_update_bucket` (not SQL).
- `src/lib/mcp/tools/create-campaign-draft.ts`, `update-campaign-draft.ts`, `list-pending-agent-drafts.ts` — event-link fields.
- `src/lib/mcp/tools/list-platform-templates.ts` — select fix.
- `src/lib/mcp/index.ts` — no new tools; re-run `app_mcp_server--extract_mcp_manifest`, redeploy `mcp`.
- `src/components/tenant/AgentDraftsPanel.tsx` — Open-asset buttons, event chip, batched lookups.
- `src/components/tenant/AssetReviewDialog.tsx` — new modal.
- `.lovable/plan.md` — guidance snippet update.

## Verification

1. Manifest regenerates; `mcp` redeploys in one round trip.
2. `list_platform_templates` returns rows (no `format` error).
3. Bucket confirmed public (or fallback executed cleanly, no mixed state).
4. Claude creates a campaign with `source_tournament_id` from `list_upcoming_events` → chip appears; unlinking via `update_campaign_draft` clears it; deleting the tournament nulls the FK without deleting the draft.
5. Attach asset + propose post → Open-asset button on both the campaign and the post card; dialog renders full-size image and metadata.
6. Reviewer approves; asset flips `is_published=true` and cron picks it up (URL still resolves).
