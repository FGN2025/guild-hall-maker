# Seed Run Dashboard

A new "Runs" tab in the tenant marketing page that shows every seed run for the current tenant: when it started, how it ended, what it produced, and — while one is running — live progress.

## What the user sees

New tab **Runs** (rocket icon) in the marketing tab row, next to Review.

Top of the tab: a summary strip with four counters — Total runs, Succeeded, Failed, Currently running.

Below it: a filter row (All / Running / Succeeded / Failed) and a list of the 25 most recent runs, newest first, with a **Load more** button that pulls the next 25.

Each run row shows:
- Start time (absolute time plus "3 hours ago")
- Status badge, using the existing human failure labels ("Credits exhausted", "Timed out", etc.)
- Mode / archetype and the scope line (target month, range, density)
- **Campaigns** and **Posts** counts created by that run, plus assets
- Duration (finished − started, or elapsed so far for a live run)
- Expandable detail with the existing planned-vs-created comparison and the failure hint

Live runs are visually distinct: an animated status dot, a turn-progress bar (`turns_used / turn_cap`), and a "created so far" line that updates every 3 seconds. Polling only runs while at least one run is active, so a quiet dashboard makes no repeated requests.

Empty state: "No seed runs yet — launch one from the Review tab."

## Technical notes

- Extend `src/hooks/useAgentRuns.ts` with a `useAgentRunsPaged(tenantId, { status, limit })` query: same `agent_runs` select, adds `.eq("status", …)` when filtered, `.range()` for paging, and `count: "exact"` so the summary strip and Load more know the totals. Polling interval stays 3s but is enabled only when a returned row has `status === "running"` (today `RecentAgentRuns` hardcodes `pollActive: true`, which polls forever).
- New `src/components/marketing/SeedRunDashboard.tsx` — summary strip, filter row, list. Reuses the run row rendering by extracting the existing `RunRow` and `IntentVsOutput` from `RecentAgentRuns.tsx` into a shared `src/components/marketing/AgentRunRow.tsx`, adding start-time and duration display there. `RecentAgentRuns` keeps working unchanged on the Review tab.
- Counts come from `created_row_ids.campaigns/scheduled_posts/tenant_marketing_assets` lengths, as today. No new queries against campaign or post tables.
- `TenantMarketing.tsx`: add the `runs` value to the tab list and a `TabsContent value="runs"` rendering `<SeedRunDashboard tenantId={tenantAdmin} />`, guarded by `tenantAdmin` like the agent tab. The tab is deep-linkable via the existing `?tab=` handling.
- Read-only: no migrations, no writes, no changes to launch, dispatch, or approval paths. Styling follows the existing card/badge/progress components.
