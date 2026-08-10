# August Remainder Seed — Scoped Re-Launch

Re-seed Acme Broadband's August 2026 calendar lane after the clean slate, restricted to the rest of the month only.

## Scope

- Seed events with a start date on or after **2026-08-11** through **2026-08-31** only.
- **Batch 1 is skipped entirely** — no monthly kickoff campaign, no kickoff poster, no kickoff post. The month is already underway. This skip is recorded in the report.
- Everything lands as `pending_review`. No approvals, no publishes, no status changes by me.

## How the scope is enforced

The seed lane takes a launcher instruction (500 char max) alongside `target_month` and `seed_density`. The launch uses:

- Mode: `monthly_calendar_seed`
- Target month: `2026-08`
- Launcher instruction (verbatim, to be pasted by Darcy):

```text
Seed only events starting on or after 2026-08-11 through 2026-08-31. Skip Batch 1 entirely: create no monthly kickoff campaign, no kickoff poster and no kickoff post, the month is already underway. Begin at the first event batch.
```

Seed density: tenant default unless Darcy overrides at launch.

## Launch step (Darcy's hands)

My session is signed out, so the hosted run needs a real user JWT. Darcy launches from `/tenant/marketing?tab=agent` → **Run Marketing Agent** card:

1. Mode = Monthly calendar seed
2. Target month = August 2026
3. Seed density = tenant default
4. Paste the instruction above into Launcher instruction
5. Launch, then tell me it is running

## Verification after the run (my side, read only)

Report with artifacts:

1. Run row: id, status, turns used, tokens, error if any, live build stamp cited first.
2. Confirmation that no kickoff campaign, poster or post exists — explicit zero-count query, and the skip noted in the report.
3. Every seeded campaign and post against the actual event set, proving no event dated before 2026-08-11 was seeded.
4. Status distribution — all `pending_review`, nothing published.
5. Per-beat composition proven via distinct `asset_id` per post, no shared graphic across beats.
6. Resolver rung per asset from persisted notes (event art / game art / plate).
7. Title normalization log, including any guard fires.
8. Storage orphan check against the freshly emptied Acme prefix — from zero, every object must be object-for-object explainable.
9. Closing invariant: campaign, post and asset counts.

## Notes

- Draft-only ceiling holds throughout: I set no status on any campaign, post or asset.
- No storage deletions this turn.
