# Scouts Tenant Layer — Build in the Merits App

The Scouts tenant layer (branding, counselor review queues, partials, blue-card export) belongs in merits.fgn.academy. This project (fgn.gg) can't edit the Merits app directly, so the work is split in two.

## Part 1 — This project (fgn.gg): keep the data flowing
- Check that challenge, task and evidence events still reach the Merits receiver with the simulation activity ID and ordered task IDs Merits needs to link requirements.
- Add an **evidence-submitted / evidence-approved** event to the existing merit webhook if it isn't sent today, so counselors in Merits see gameplay evidence without logging into Play.
- No merit screens come back to fgn.gg. Player gameplay stays the same.

## Part 2 — Merits app: a ready-to-paste build brief
I'll write a complete brief (saved to Files) for you to paste into the Merits project. It covers:
- **Scouts branding**: tenant logo, colors and a "Powered by FGN" line on every Scouts screen.
- **Counselor review queue**: requirement submissions grouped by badge, with Credit / Partial / Return actions. Only registered, badge-approved counselors with current training can sign.
- **Partials**: kept until age 18 with original counselor, date and requirement version.
- **Blue-card export**: a printable per-Scout, per-badge record (application, partial record, completion) as PDF and CSV.
- **Separate states**: digital completion, badge eligible, recorded with Scouts, physical badge issued.
- **Youth protection**: no unrecorded one-to-one adult and youth contact; every counselor message copies a second adult or is logged.
- **Rollout order**: Aviation, Truck Transportation, Electricity, Home Repairs, Automotive Maintenance, with Safety alongside the first.

## What I need from you afterward
Paste the brief into the Merits project, and tell me once its receiver accepts the new evidence event so I can fire a test.

## Technical details
- fgn.gg: extend `merit-connector-api` dispatch with `evidence.submitted` / `evidence.approved` (HMAC-SHA256, same secret and contract as `challenge.*`), payload carries `challenge_id`, `task_id`, `simulation_activity_id`, player reference, evidence URL (signed, short-lived). Update `docs/merit-connector.openapi.yaml`. Fire one test event and record the result.
- Brief lists the Merits-side tables (counselor assignments in a dedicated table, never profiles; versioned immutable requirements; decisions append-only) with grants and RLS scoped by tenant.
- No changes to marketing automation, scheduling, or the Studio read API.
