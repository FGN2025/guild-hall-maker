# Tenant & Admin Feature Audit — QA Plan

## Goal
Produce a single QA report covering every tenant-facing surface, the platform-admin features that manage tenants, the backend that powers them, and the cross-cutting integrations. Each finding gets a severity, evidence, and a recommended fix. After delivery, I'll propose a separate fix plan for the highest-severity items.

## Scope

**1. Tenant Admin pages** (`/tenant/*`)
Dashboard, Players, Leads, Subscribers, ZipCodes, Codes, Team, Branding, Settings, Events, Marketing, MarketingAssets, MarketingDetail, WebPages, Guide.

**2. Platform Admin tenant-management**
AdminTenants, AdminAccessRequests, AdminLegacyUsers, AdminInquiries, AdminBypassCodes, AdminDiscordBypass.

**3. Backend surface**
RLS policies, RPCs (`get_tenant_lead_players`, `lookup_providers_by_zip`, `admin_resync_tenant_registrations`, `is_tenant_member`, `is_tenant_admin`, etc.), triggers (`handle_new_user`, `claim_tenant_invitations`, `claim_subscriber_records`, `prevent_player_tenant_admin`, Discord/Academy enqueues), edge functions touching tenant data, pgmq queues + DLQs.

**4. Cross-cutting integrations**
NISC/GLDS billing sync, Stripe tenant subscriptions, Discord webhooks/routes, Academy sync (challenge/quest/chain/task/achievement + passport refresh), ecosystem auth tokens + sync log, email queue / suppression / unsubscribe.

## Method

### Phase 1 — Static audit (read-only)
For each page and hook:
- Confirm route is wired, guarded by the right `*Route` component, and visible in the correct sidebar.
- Trace data hooks → RPC/table → RLS. Flag dead imports, TODOs, commented-out UI, unhandled error states, missing toasts, missing loading/empty states, mutations that don't invalidate queries.
- Cross-check `src/integrations/supabase/types.ts` against actually-used columns to spot drift.
- Note duplicated/legacy code paths superseded by newer ones (e.g. old vs hardened `handle_new_user`).

### Phase 2 — Live data probes (SQL, read-only)
Run targeted SELECTs to surface real-world breakage:
- Orphans: `tenant_admins` / `tenant_subscribers` / `user_service_interests` / `tenant_zip_codes` / `tenant_events` / `tenant_codes` / `legacy_users` pointing to missing users or inactive tenants.
- Coverage: tenants with 0 ZIPs, 0 admins, 0 leads, or 0 subscribers; ZIPs claimed by multiple tenants.
- Triggers: profiles without `user_service_interests`, legacy users with `matched_user_id` but no interest row, FGN-fallback rows where a real tenant now matches.
- Queues: `pgmq.q_academy_*` pending vs DLQ depth, oldest message age; `passport_refresh_pending` backlog.
- Integrations: `tenant_sync_logs` recent failures, `ecosystem_sync_log` failures, `discord_send_log` failures, `email_send_log` failures + `suppressed_emails` growth, `tenant_integrations` rows missing keys.
- Stripe/billing: `tenant_subscriptions` in non-terminal states older than X days, tenants flagged active without a subscription row.
- Access: `access_requests` / `discord_bypass_requests` / `provider_inquiries` stuck in `pending` > 7 days.

### Phase 3 — Lint + security cross-check
Run `supabase--linter` and review `security--get_scan_results` for anything touching the audited surface; fold into the report rather than fixing here.

## Deliverable

`/mnt/documents/tenant-audit-2026-06-22.md` with sections:
1. Executive summary — counts by severity (P0/P1/P2/P3) and area.
2. Per-page findings — file:line refs, what's broken/incomplete, severity, recommended fix.
3. Backend findings — RLS gaps, trigger gaps, RPC issues, queue health, schema drift.
4. Integration findings — Stripe/NISC/GLDS/Discord/Academy/ecosystem/email.
5. Live data probe results — table of counts with interpretation.
6. Dead/orphan code — pages, hooks, components, columns no longer referenced.
7. Recommended fix order.

Severity rubric:
- **P0** broken in production / data loss / security
- **P1** feature unusable or visibly wrong for a real user
- **P2** rough edges, missing affordance, partial implementation
- **P3** cleanup, dead code, copy nits

## After the report
I'll come back with a second `plan--create` covering the P0/P1 fixes (and any P2 clusters that share a migration) for your approval before any code changes.

## Explicitly NOT in this pass
- No code or schema changes.
- No Playwright runs (you chose static + data probes).
- No re-audit of areas outside tenant + admin-tenant scope (player-only UX, tournaments, quests internals, coach, etc.) except where they directly touch a tenant surface.

## Risks / assumptions
- Live probes are read-only SELECTs; no writes.
- Report is a snapshot — counts will drift after any future migration.
- If a probe surfaces something obviously destructive (e.g. orphan rows about to be served to users), I'll call it out as P0 but still wait for the follow-up plan before fixing.