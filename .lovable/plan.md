
The user wants two things:
1. A detailed summary of every feature/function in the Admin → Ecosystem tab
2. End-to-end testing of those features in the live preview

This is a research + verification task. I'll need to:
- Read `src/pages/admin/AdminEcosystem.tsx` and any sub-components/hooks it uses
- Inspect related edge functions (`ecosystem-data-api`, `ecosystem-magic-link`, `ecosystem-webhook-dispatch`, `ecosystem-calendar-feed`, `validate-ecosystem-token`)
- Check related DB tables (`ecosystem_sync_log`, webhook tables, etc.)
- Use browser tools to navigate to /admin/ecosystem and exercise each control
- Use `supabase--curl_edge_functions` and `supabase--read_query` to verify backend behavior
- Produce a structured summary with a pass/fail/observations table per feature

Since this requires browser automation + edge function calls + DB reads (write-capable tools), I'll present this plan for approval before switching to default mode to execute.

## Plan: Audit & Test the Admin Ecosystem Tab

### Phase 1 — Code discovery (read-only)
- Read `src/pages/admin/AdminEcosystem.tsx` and identify every tab, card, button, form, and table it renders
- Read supporting components (e.g., any `EcosystemSyncPanel`, `WebhookManager`, `MagicLinkTester` if present)
- Inspect related edge functions: `ecosystem-data-api`, `ecosystem-magic-link`, `ecosystem-webhook-dispatch`, `ecosystem-calendar-feed`, `validate-ecosystem-token`
- Check relevant tables: `ecosystem_sync_log`, any webhook config / dispatch tables, ecosystem keys storage
- Cross-reference the existing memory: `mem://architecture/ecosystem-integration` and `mem://auth/cross-app-magic-links`

### Phase 2 — Live testing in preview
For each feature surfaced in Phase 1, exercise it on `/admin/ecosystem`:
- Navigate via `browser--navigate_to_sandbox` to `/admin/ecosystem`
- `observe` → `act` per control (tab switches, button clicks, form submissions, copy-to-clipboard, etc.)
- Capture screenshots at meaningful checkpoints (not every action)
- Skip destructive operations unless they are clearly safe (e.g., test webhook dispatch to a known test target — confirm with you first if anything looks risky)

### Phase 3 — Backend verification
- Hit `ecosystem-data-api` via `supabase--curl_edge_functions` for each documented action: `health`, `tournaments`, `tenant-events`, `challenges`, `quests`, `achievements`, `season-stats`, `player-progress`
- Pull recent `ecosystem_sync_log` rows via `supabase--read_query` to confirm UI activity is recorded
- Tail `supabase--edge_function_logs` for any errors during testing

### Phase 4 — Deliverable
A single structured report containing:
1. **Feature inventory** — every UI element with purpose
2. **Test results table** — Feature | Action taken | Expected | Observed | Status (✅ / ⚠️ / ❌)
3. **Backend health** — edge function + DB confirmations
4. **Issues & recommendations** — anything broken, confusing, or off-spec

### Guardrails
- No code changes during this audit — purely investigative
- Will pause and ask before any action that could send real notifications, mutate production data, or trigger external webhook endpoints
- If the preview requires login I'll stop and ask you to log in first
