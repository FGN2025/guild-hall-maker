## Wave 2.3 — Close as "no action required"

**Rationale (user-confirmed):** Challenge handoff between play.fgn.gg and fgn.academy is working in production. The original audit finding flagged that `ECOSYSTEM_API_KEY` / `PLAY_WEBHOOK_SECRET` are read from env without hard-fail logging, and that per-tenant `academy_sync_enabled` gating isn't enforced at the queue-processor layer. Since the live integration is healthy and the keys are present in every environment that runs the processors, adding hard-fail guards and a per-tenant gate would be defensive-only work with no observed defect to fix.

### Decision
Skip code/migration changes for 2.3. Document the decision so it doesn't resurface in the next audit pass.

### What I'll do (docs only, no schema or code)
1. Append a short "Audit 2.3 — closed, no action" note to `docs/fgn-academy-integration.md` covering:
   - Date and reason (handoff verified healthy in prod).
   - Current safeguards already in place: HMAC signing (`PLAY_WEBHOOK_SECRET`), `X-Ecosystem-Key` auth, DLQ on the sync queue, `ecosystem_sync_log` admin trail.
   - Re-open triggers — if any of these occur, revisit hard-fail + per-tenant gating:
     - Sustained DLQ growth on `academy_sync`, `academy_task`, `academy_quest`, `academy_chain`, `academy_achievement` queues.
     - Silent 401/403 from `ecosystem-data-api` in `ecosystem_sync_log`.
     - A tenant requesting opt-out of Academy sync.
2. Update `.lovable/plan.md` Wave 2 section: mark 2.3 as **Closed — no action (handoff verified)**, leave 2.5 status (already satisfied), and confirm 2.1 / 2.2 / 2.4 done.

### Remaining Wave 2 status after this
- 2.1 Tenant health summary + coverage badges — ✅ done
- 2.2 ZIP overlap warning — ✅ done
- 2.3 Academy key enforcement — ⏭️ closed, no action
- 2.4 RLS hardening on `provider_inquiries` — ✅ done
- 2.5 Lead email visibility — ✅ already satisfied (no column rendered)

Wave 2 closes out with this docs update. Ready to move to Wave 3 planning afterward.