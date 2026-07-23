
# Marketing Agent MCP Integration (Claude) — Revised

Claude-built agents drive the marketing pipeline (copywriting, visual generation, scheduling, QA review) by calling tools this app exposes over its existing FGN MCP server. Every agent action lands as a **draft** in the tenant's own branded library — nothing publishes without a tenant admin approving in-app.

## Approach

Extend `src/lib/mcp/` with a **marketing tool bundle**, gated by the existing Supabase OAuth 2.1 flow. Claude connects as a real user; RLS + tenant role checks apply automatically. Marketing writes are restricted to callers holding `tenant_admin`, `manager`, or `marketing` roles on the target tenant.

**Every agent-produced asset writes to `tenant_marketing_assets` (the tenant's private branded library) — never to `media_library` (the platform-wide per-user library) and never to `marketing_assets` (admin-only platform templates).** The agent may *read* platform templates from `marketing_assets` to use as a starting point, but the resulting draft is cloned into `tenant_marketing_assets` with `source_asset_id` lineage preserved, exactly like the existing "Save from Library" flow.

## Two behaviors confirmed

1. **Cron dispatcher uses exact `status = 'pending'` match** — `pending_review` rows are structurally invisible to the dispatcher, so drafts cannot accidentally publish.
2. **Rejection feedback column exists on both tables** — `scheduled_posts.feedback_note` AND `marketing_campaigns.feedback_note` (text, nullable) are both added in this migration so campaigns and posts can each carry reviewer feedback.

## MCP tools

Read:
- `list-tenants` — tenants the caller belongs to, brand-kit summary (primary/accent colors, logo URL), **stored tenant timezone** (if the column exists; otherwise UTC), and **connected social platform labels** (derived from `social_connections` for that tenant).
- `get-brand-kit` — full branding: colors, logo variants, voice notes, banned words, hashtags.
- `list-upcoming-events` — tournaments + `tenant_events` in the next N days for the tenant.
- `list-platform-templates` — read-only listing of `marketing_assets` templates the agent can clone.
- `list-tenant-assets` — read `tenant_marketing_assets` for the tenant.
- `list-pending-agent-drafts` — returns both `pending_review` rows AND `rejected` rows (last 30 days). Each row: id, kind (`campaign` | `scheduled_post` | `asset`), status, `feedback_note`, `updated_at`, plus the row's primary fields, so the agent can prioritize revisions.

Write (create):
- `create-campaign-draft` — inserts `marketing_campaigns` row, `status='draft'`, `agent_source='claude-mcp'`. Accepts optional `idempotency_key` (text); on `(tenant_id, idempotency_key)` collision returns the existing row instead of inserting.
- `attach-tenant-asset-draft` — inserts `tenant_marketing_assets` row, `is_published=false`, `agent_source='claude-mcp'`, `campaign_id` set, optional `source_asset_id` for platform-template lineage. **Server-side ingestion**: when given a URL, the tool downloads the file server-side, uploads it into the `tenant-marketing` bucket under `{tenant_id}/agent/{yyyy}/{mm}/{uuid}.{ext}`, stores the permanent Supabase Storage URL on the row's existing image URL column, and preserves the caller-supplied URL in a new `source_url` column for lineage. Direct bytes uploads follow the same path.
- `propose-scheduled-post` — inserts `scheduled_posts` row with `status='pending_review'`. `scheduled_at` is `timestamptz` stored in UTC; the tool accepts an ISO 8601 string with an explicit offset (e.g. `2026-07-24T14:00:00-05:00` or `…Z`) and rejects offset-less input with a 400-style error message. Accepts optional `idempotency_key` (same collision behavior scoped to `(tenant_id, idempotency_key)`).

Write (revise — new):
- `update-campaign-draft` — updates a `marketing_campaigns` row. RLS restricts updates to rows in `draft`, `pending_review`, or `rejected` status AND (`proposed_by = auth.uid()` OR caller is a tenant marketer). Editable fields: name, copy, notes, target platforms. Does not change `status` directly.
- `update-scheduled-post` — same status + ownership restriction as above. Editable fields: `scheduled_at`, platforms, copy, asset reference, `campaign_id`. Additional behavior: if the row's current status is `rejected`, the update flips `status` back to `pending_review` and clears nothing else (feedback note preserved for audit).

Self-check:
- `list-pending-agent-drafts` (above) is how the agent reads its own rejections and pending items across turns.

## Files

- `src/lib/mcp/index.ts` — register all new tools.
- `src/lib/mcp/tools/{list-tenants,get-brand-kit,list-upcoming-events,list-platform-templates,list-tenant-assets,list-pending-agent-drafts,create-campaign-draft,attach-tenant-asset-draft,propose-scheduled-post,update-campaign-draft,update-scheduled-post}.ts` — new.
- `src/pages/tenant/TenantMarketing.tsx` + new `AgentDraftsPanel` component — Agent Drafts tab (Approve / Reject-with-note / Edit).
- `.lovable/mcp/manifest.json` — regenerated via `app_mcp_server--extract_mcp_manifest`.

## Database changes (single migration)

- `scheduled_posts`: add `pending_review` and `rejected` to status domain; add columns `proposed_by uuid` (FK `auth.users`, nullable), `agent_source text`, `feedback_note text`, `idempotency_key text`, `source_url text` (unused here but kept symmetric with assets — skipped if not needed). Unique index on `(tenant_id, idempotency_key)` where key IS NOT NULL. Confirm dispatcher WHERE clause remains `status = 'pending'` (exact match).
- `marketing_campaigns`: add `agent_source text`, `feedback_note text`, `idempotency_key text`, `proposed_by uuid` (FK `auth.users`, nullable), ensure `status` supports `draft`, `pending_review`, `rejected`, `published`. Unique index on `(tenant_id, idempotency_key)` where key IS NOT NULL.
- `tenant_marketing_assets`: add `agent_source text`, `proposed_by uuid`, `source_url text` (original caller-supplied URL for lineage; the primary image URL column continues to hold the permanent Storage URL).
- Storage: ensure `tenant-marketing` bucket exists with tenant-scoped path convention `{tenant_id}/agent/...`; RLS on the bucket restricted to tenant marketers for write, tenant members for read.
- New helper `public.is_tenant_marketer(uuid)` = admin OR manager OR marketing role — reused by all marketing tool RLS checks.
- RLS INSERT policies on `marketing_campaigns`, `tenant_marketing_assets`, `scheduled_posts`: require `is_tenant_marketer(tenant_id)`; when `agent_source IS NOT NULL`, force `is_published=false` / `status IN ('draft','pending_review')`.
- RLS UPDATE policies for the two new update tools: allow when row `status IN ('draft','pending_review','rejected')` AND (`proposed_by = auth.uid()` OR `is_tenant_marketer(tenant_id)`). Tenant admins retain full UPDATE rights via existing policies for approval transitions.
- GRANTs: `SELECT, INSERT, UPDATE` to `authenticated` on affected columns; `service_role` retains ALL.

## Approval UI (Tenant Marketing → new "Agent Drafts" tab)

- Lists draft/pending_review campaigns, `pending_review` scheduled posts, and last-30-day `rejected` items with agent-source badge, proposed copy, asset preview, target platforms/time, and any `feedback_note`.
- **Approve** flips campaign to `published` / scheduled post to `pending` (cron picks it up at `scheduled_at`) and toggles `tenant_marketing_assets.is_published=true`.
- **Reject** sets `status='rejected'` and writes reviewer text to `feedback_note` for the agent to read next turn.
- **Edit** opens existing `AssetEditorDialog` / schedule form pre-filled.
- `tenant_admin` + `manager` can approve/reject; `marketing` role is read-only.

## Claude connection guidance (in-app doc snippet)

- MCP URL: `https://<project>.supabase.co/functions/v1/mcp` (already deployed).
- Auth: Supabase OAuth 2.1 (already configured); tenant admin approves via `/.lovable/oauth/consent`.
- System-prompt template instructs the agent to: (a) always write assets via `attach-tenant-asset-draft`, (b) end workflows with `propose-scheduled-post` (`pending_review`), (c) never attempt direct publish, (d) always supply `idempotency_key` on retries, (e) send `scheduled_at` as ISO 8601 with explicit offset, (f) restrict `platforms` to those returned by `list-tenants`, (g) on each turn call `list-pending-agent-drafts` and address rejected rows via `update-*` tools.

## Out of scope (follow-ups)

- Server-side image generation triggered by the agent (agent supplies URL/bytes this pass; ingestion is server-side).
- Post-performance feedback loop back to the agent.
- Per-tenant "auto-publish with guardrails" toggle — locked to draft-only.
- Dedicated `tenant_brand_kits` table build-out — this pass exposes existing branding fields.

## Verification

1. `app_mcp_server--extract_mcp_manifest` succeeds and lists all new tools.
2. Deploy `mcp` edge function.
3. From Claude Desktop: run each read tool, then create+attach+propose. Confirm rows appear only in the correct tenant tables, are visible in Agent Drafts, and are NOT dispatched by cron (verify dispatcher filter is exact `status='pending'`).
4. Retry create/propose with the same `idempotency_key` → same row returned, no duplicate.
5. Submit `scheduled_at` without an offset → rejected with a clear error; with `Z` or `±HH:MM` → accepted and stored as UTC.
6. `attach-tenant-asset-draft` with an external URL → file exists in `tenant-marketing/{tenant}/agent/...`, row's image URL points at Storage, `source_url` holds the original.
7. Reject a scheduled post with a note → appears in `list-pending-agent-drafts` with `feedback_note`; agent calls `update-scheduled-post` → status flips back to `pending_review`, note preserved.
8. `list-tenants` returns tenant timezone (when present) and connected platform labels; propose using a non-connected platform still succeeds structurally but agent guidance filters it out.
9. Approve a proposed post; underlying asset `is_published` flips true and cron picks it up.
10. Cross-tenant and non-marketer write attempts denied by RLS.
