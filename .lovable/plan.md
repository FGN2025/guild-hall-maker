# Lapse Guard: why the August seed died, and what to build

## Step 1 — Root cause, from code and data

**The overdue alert fired. It fired too late, and only once. It never had a chance to save anything.**

Selection logic, `supabase/functions/publish-scheduled-posts/index.ts:173-198`:

```ts
// 1. Overdue pending_review — approved late or never; notify humans.
const { data: overduePending } = await supabase
  .from("scheduled_posts")
  .select("id, tenant_id, platform, scheduled_at, agent_source, overdue_notified_at")
  .eq("status", "pending_review")
  .lte("scheduled_at", nowIso)      // <-- fires only AFTER the slot has passed
  .is("overdue_notified_at", null)  // <-- once per post, forever
  .limit(100);
```

Answering the five candidate mechanisms directly:

- Does it only cover approved posts? No — it targets `pending_review` exactly.
- Did it fire to nobody? No. `notifications` holds 32 rows with `category='overdue'`, 27 of them marked read. `orphaned_notifications` holds 0 overdue rows, so every alert had at least one recipient. Acme has 3 tenant admins.
- Did it fire after the scheduled time rather than before? **Yes. This is the mechanism.** `overdue_notified_at` on the lapsed rows lands 2–12 seconds after `scheduled_at`:

| post | scheduled_at | overdue_notified_at |
| --- | --- | --- |
| a9faa31e | 2026-08-12 20:00:00Z | 2026-08-12 20:00:04.11Z |
| 62b5c89c | 2026-08-15 17:00:00Z | 2026-08-15 17:00:04.52Z |
| 7725a3e7 | 2026-08-18 20:00:00Z | 2026-08-18 20:00:11.66Z |
| 0997da91 | 2026-08-25 20:00:00Z | 2026-08-25 20:00:05.16Z |
| 7dc04dd5 | 2026-08-30 17:00:00Z | 2026-08-30 17:00:02.66Z |

11 of the 16 rejected rows carry an `overdue_notified_at`; the other 5 were disarmed by hand before their date and correctly never fired.

- Is it gated on a connection or a status seed rows lack? No.
- Does it not run on this table? It does.

So: **the alert worked, was delivered, was largely read, and was useless.** It is a death certificate, not a warning. Once `scheduled_at` has passed there is no action left except the manual rejection walk that actually happened. The `is("overdue_notified_at", null)` clause also means a post ignored for twelve days produced exactly one notice, so silence afterwards read as "nothing wrong."

The daily `pending-review-digest` (cron `pending-review-digest-daily`, 14:00 UTC) is the counterweight, but its migration is dated 2026-08-23 — after most of the August seed had already lapsed. It also lists the queue without a deadline framing.

Secondary contributor: nothing stopped the seed from creating rows whose review runway was short or negative in the first place.

## Step 2 — The guard

### A. Lapse state

New terminal status **`lapsed`** on `scheduled_posts`, distinct from `rejected`.

- Set by a scheduled job (not by the dispatcher's publish path) when `status='pending_review'` and `scheduled_at < now()`.
- Writes a system reason into `feedback_note`, e.g. `Lapsed: scheduled slot passed on <ts> while awaiting review. No human decision was made.` Nobody types anything.
- Unpublishable by construction: `is_dispatch_approved` stays false, and the dispatcher's due-row filter never sees a non-approved status.
- Reversible only forward: a human may re-schedule a lapsed post (new future `scheduled_at`), which returns it to `pending_review`. It can never go from `lapsed` straight to `approved`.
- Parent campaign: when every child post of a campaign is `lapsed`, the campaign gets a derived `lapsed` marker as well (status change plus a system note). If any child is still live, the campaign is untouched. I would **not** cascade-delete or reject the campaign, so the assets stay reusable for a re-seed.

Disagreement with the shape: none on the state itself. One caveat — the lapse job must be idempotent and rate-limited so a backlog cannot generate a notification storm.

### B. Pre-expiry escalation

Replace one-shot post-mortem alerting with a runway ladder, keyed off `scheduled_at`:

| Lead time | Who | Channel |
| --- | --- | --- |
| T-72h | tenant admins + managers + marketing | in-app, batched into the daily digest |
| T-24h | tenant admins + managers | in-app + email, immediate |
| T-4h | tenant admins + managers | in-app + email, immediate, "final call" |
| T-0 (lapse) | tenant admins + managers, plus platform admin summary | in-app + email, states the post is now lapsed |

Each rung stamps its own column (`warn_72_at`, `warn_24_at`, `warn_4_at`) so a rung fires at most once and silence between rungs is not mistaken for health. Alerts group per tenant per rung, so twenty posts is one message, not twenty.

### C. Urgency in the review UI

The Agent Drafts queue becomes a deadline list:

- Per-row "time remaining" (`due in 3d`, `due in 6h`, `past window by 2d`) with colour by band: normal > 72h, amber 24–72h, red < 24h, grey for lapsed.
- Default sort by `scheduled_at` ascending, so the next thing to die is at the top.
- A pinned banner: "N posts lapse in the next 24 hours."
- A filter chip for lapsed rows, off by default, so the pile does not hide the live queue.
- Same urgency badge on the Marketing tab counter and the portal bell.

### D. Seed-time guard

**Tool contract, not prompt.** Agreed with your lean, and I would go one step further and back it with a DB check so it cannot regress through either the tool or a direct write.

- `propose_scheduled_post` rejects any `scheduled_at` earlier than `now() + minimum_review_runway`, default **48 hours**, per-tenant overridable via `app_settings`. Error text tells the agent the earliest legal slot so it can self-correct in the same turn.
- A DB `CHECK`/trigger enforces the same floor for agent-authored inserts (`agent_source IS NOT NULL`). Human-authored posts are exempt — a human scheduling something for tomorrow is a deliberate act.
- The prompt gets one sentence describing the rule, purely so the agent plans around it rather than discovering it by error.

## Hard constraint

Nothing here approves, publishes, or advances any post. The lapse job only moves rows *down* into a terminal, unpublishable state; escalation only sends messages; the seed guard only blocks creation. `is_dispatch_approved` remains `status='approved' AND approved_at IS NOT NULL`, both stamped only by a human decision. No path in this design writes `approved`.

## Blast radius

- **Lane 2 and every other tenant:** the escalation ladder and the UI urgency apply to all `scheduled_posts`, regardless of lane or `agent_source`. The seed-time floor applies only to agent-authored inserts, so human scheduling is unaffected.
- **Legacy rows already past their date:** no mass mutation without your sign-off. Today's counts are 34 approved, 16 rejected, 6 failed, 6 published — and **zero** rows currently in `pending_review`, so the lapse job would touch nothing on day one. That makes a backfill entirely optional. If you later want the historical hand-rejected August rows re-labelled `lapsed` for reporting honesty, that is a separate, explicitly approved migration, not part of this work.
- **September rows in flight:** all 34 are `approved`, not `pending_review`, so the lapse job cannot touch them. Three are past-dated and held by `dispatch_kill_switch='on'`; this design does not read, change, or release the kill switch.
- **Notification volume:** three new rungs per post is a real increase. Batching per tenant per rung keeps a 30-post seed at three messages per rung rather than ninety.

## August 6 hardening checkpoint — where it landed

- **Build stamp is live.** Probed today: `GET /functions/v1/agent-run` returns `{"build_id":"2026-09-01T00:55Z-dispatch-controls"}` and the MCP OAuth metadata returns `resource_documentation: .../docs/mcp/build/2026-09-01T00%3A55Z-dispatch-controls`. Both match `supabase/functions/_shared/build-id.ts`. The `tenant_event_registrations_broad_visibility` block no longer holds the stamp back; the stamp shipped with the later dispatch-controls deploy.
- **Composer equivalence proof:** it was run and accepted in the #4972 → #4974 exchange. It was then invalidated by the #4976 → #4979 type-scale and `Prize Pool:` text change, which rerendered 24 assets. There is no re-run of the proof against the current composer. If you want a live equivalence proof again, that is a separate ask.
- **Prompt version:** v5 is **not** active. `marketing_agent_calendar_seed` v6 is active — MD5 `83b7a6e494a69dcbb256bdde88074ce1`, 8,849 chars. v5 (MD5 `9655d01f016ef155efc72637a3a918e3`, 7,312 chars) is inactive.

## Technical notes

- Table changes: `scheduled_posts` gains `warn_72_at`, `warn_24_at`, `warn_4_at`, `lapsed_at`; status vocabulary gains `lapsed`.
- The lapse + escalation sweep runs as its own scheduled function rather than riding inside `publish-scheduled-posts`, so a kill-switched dispatcher does not silence warnings.
- The existing `overdue` category and `overdue_notified_at` stay in place for continuity; the T-0 rung reuses them.
- Client surfaces touched: the Agent Drafts panel, `useTenantReviewQueue`, `useAheadPendingPosts`, and the scheduled-posts calendar.
