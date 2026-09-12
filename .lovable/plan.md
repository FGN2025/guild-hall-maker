# Marketing Agent — State Assessment and Path to Done

Verified by live query on 2026-09-12, not from memory.

## Where it stands

The pipeline works end to end. Eight posts have published to the live Facebook page, two of them unattended in the last 48 hours. Approval, dispatch and publishing are sound.

Live state confirmed just now:

- Nothing approved is sitting past its scheduled time (0 rows), nothing is stuck pending review (0 rows).
- Publishing is running (kill switch off).
- One active social connection, one tenant with any marketing material. 79 of 80 tenants have never touched the agent.
- 14 agent runs recorded, but **zero** have run under the new instrumented build. The reliability work is shipped and unmeasured.

## What is actually blocking "done"

**1. Marketing-role staff cannot launch the agent.** You asked for the agent to work for a tenant admin *or* a tenant marketing role. Today only `admin` and `manager` on a tenant can start a run; a marketing user is refused. This is the clearest gap against your stated goal.

**2. The `mcp` endpoint is running old code.** The source tree already carries the current build stamp, so the deployed copy is simply behind. The promo composer lives there, which means nobody can prove the artwork people approved was made by the code running now. Redeploy and confirm the stamp moves.

**3. Drafts can still die silently in review.** The overdue alert fires *after* the deadline. A whole August seed expired this way. The lapse guard (72/24/4-hour warnings, a real `lapsed` end state, a 48-hour minimum review runway) is planned and unbuilt.

**4. The Facebook token has no expiry and no refresh.** It is the only working channel and it will stop one day with no warning.

**5. The reliability work has never been measured.** Zero instrumented runs. It needs one seed launched from a dashboard session on the scratch tenant to produce the numbers.

**6. Three unexplained changes** (the build stamp, prompt versions v3/v6, idempotency appearing on the assets table) should be explained before anything downstream is trusted. Precedent: a guardrail trigger was silently dropped in August and went unnoticed for ten days.

## Proposed order of work

1. **Marketing role gets full parity with a tenant admin for marketing automation.** A tenant marketing user can launch runs, compose, review, approve and reject, scoped strictly to their own tenant. Parity covers marketing only — it grants nothing over billing, team, subscribers or other tenant settings. Nothing changes about the draft-only ceiling.
2. **Redeploy `mcp`**, confirm the stamp, and state whether composer output changed.
3. **Explain the three unexplained changes**, with evidence, and confirm the calendar-seed totals fix survived into v6.
4. **Build the lapse guard.** Terminal `lapsed` state set by its own job, escalation ladder with per-rung stamps, deadline framing in the drafts queue, 48-hour minimum runway. No path in it may write `approved`.
5. **Facebook token durability.** Record expiry, refresh worker, alert before expiry.
6. **Measure the reliability build.** One seed on the scratch tenant, far-future fixtures, then the kill/resume and replay proofs and the trailing-ten completion metric.
7. **Admin console visibility** and a kill-switch audit trail, before a second tenant.
8. **Storage sweep** for the 176 unreferenced objects, as a recurring job, checking every reference path before deleting.

## Rules that survive this plan

- Every agent write lands in `pending_review`. No lane, mode or deadline moves a row to `approved` without a human.
- Acme publishes to the real public page. Anything experimental runs on the scratch tenant.
- One shared layout module for human and agent composition; no forks.
- Grace on resume stays capped at six hours.

## Technical notes

- Launch authorisation lives in `supabase/functions/agent-run/index.ts` (~line 890): platform admin, else `tenant_admins.role in (admin, manager)`. Marketing membership should be admitted via the existing `is_tenant_marketing_member` / `is_tenant_marketer` functions rather than a new role column.
- `supabase/functions/mcp/index.ts` already declares `2026-09-12T00:00Z-work-derived-budget`; only the deploy is stale.
- Lapse work touches `publish-scheduled-posts` (current post-mortem alert), `pending-review-digest`, `useTenantReviewQueue.ts` and the Agent Drafts UI; the sweep should be its own scheduled function, not the dispatcher.
- `social_connections` already has `token_expires_at` and `refresh_token`; no code reads or writes either.

## Decided

Marketing role has the same powers as a tenant admin across the marketing automation: launch, compose, review, approve, reject. It stays confined to its own tenant and to marketing surfaces.
