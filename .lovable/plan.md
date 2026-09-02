# Close the event-registration visibility finding, and rewrite the briefing against September state

## Part A — `tenant_event_registrations_broad_visibility`

### What is actually there right now (verified)

Live policies on `public.tenant_event_registrations`:

- `Users can view own registrations` — SELECT, `auth.uid() = user_id`
- `Users can register for events` — INSERT, self only
- `Users can cancel own registrations` — UPDATE, self only
- `Tenant admins can view event registrations` — SELECT, any user whose `tenant_admins` row for the event's tenant is `admin` **or** `manager`
- `Platform admins can manage all registrations` — ALL, `has_role(admin)`

The table stores `event_id`, `user_id`, `registered_at`, `status`. The registrant identity is the `user_id`, joinable to `profiles`.

Code search shows **no UI reads that staff SELECT path**. `useTenantEvents.registrationsQuery` is defined but never called from any page or component; the only live reads are the player's own row in `TenantEventDetail`. So the policy grants an identity list that nothing in the product actually consumes.

### The call

Drop the tenant-staff SELECT policy. Registrant identities become visible to the registrant and to platform admins only — the same read model already enforced for `tournament_registrations`, and consistent with the August decision that registered counts belong to platform roles.

Tenant staff do not lose a working feature, because they never had a screen for it. If Darcy later wants tenant admins to see who signed up for their own event, that comes back as a deliberate, narrower build (an admin-only attendee screen behind a security-definer function that returns display names, not raw auth ids) rather than as a blanket table read.

Capacity behaviour is unaffected: `tenant_events.max_participants` is a column on the event row, not derived from the registration table, and the public event page shows "Max N".

### Change

One migration:

- `DROP POLICY "Tenant admins can view event registrations" ON public.tenant_event_registrations;`

No column changes, no data writes, no grants changed, no other table touched. Then re-run the security scan and mark the finding resolved with the reasoning above.

### Verification

- Re-list `pg_policies` for the table and show the four remaining policies.
- Confirm a tenant-manager-shaped read returns zero rows while the registrant's own read still returns their row.
- Confirm the public event page and register button still work.

## Part B — Rewrite the continuity briefing against real September state

There is no continuity briefing file in the repo today; it has been living in chat. This makes it a real document at `docs/continuity-briefing.md`, rebuilt entirely from queried state rather than carried forward from August narration.

Every claim in it gets sourced from a read taken while writing it. Sections:

1. **Ground truth header** — production project ref, `now()` from the database, live `BUILD_ID` from the deployed functions, and the date the briefing was compiled. Stated up front so a stale copy is obvious on sight.
2. **Acme queue state** — scheduled post counts by month and status, the armed September slate, next fire time, and the six `stale_window` failures with their standing disposition (dead, deliberately).
3. **Dispatcher and controls** — cron job id and last run, `dispatch_kill_switch` absent/off, `publish_quota_daily` 6 / `publish_quota_monthly` 60 with their exact stored JSON shape and calendar-window counting semantics, and the separate `agent_run_limits` 2/10 seed-run caps that must not be conflated with them.
4. **Agent and review pipeline** — active prompt version, the `pending_review` ceiling enforced by database triggers, what the Agent Drafts queue shows, and the canonical `approved` status.
5. **What was rolled back** — `enforce_scheduled_post_asset_link` never existed on this database; `asset_id` and `image_path` predate the session (migrations `20260806170435`, `20260806170600`).
6. **Open items** — registration-count/visibility work (closed by Part A), social-token exposure finding still open, orphaned storage objects, Resend delivery visibility.
7. **Known-bad framing to distrust** — a short list of the August-dated claims that turned out to be narration rather than row-derived, so nobody re-imports them.

Superseded plan files under `.lovable/plan/` stay as history; the briefing links to nothing that has not been re-verified.

## Technical notes

- Files: one new migration; `docs/continuity-briefing.md` (new).
- No edge function deploys, no publish, no changes to any `scheduled_posts` row, no changes to `app_settings`.
