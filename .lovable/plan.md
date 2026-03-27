

## Generate Gap Analysis PDF Report

### What
Create a downloadable PDF report documenting the mismatches between the fgn.academy integration guide and the current `sync-to-academy` edge function implementation on play.fgn.gg. This report is intended for the fgn.academy dev team.

### Report Sections
1. **Executive Summary** — High-level status of the integration
2. **Endpoint Mismatch** — Guide expects `sync-challenge-completion` Supabase function; current code posts to `fgn.academy/api/ecosystem/challenge-completed`
3. **Payload Structure Gap** — Guide expects flat fields (`user_email`, `challenge_id`, `score`); current code sends nested objects (`player.email`, `challenge.id`)
4. **Missing Fields** — `score` (0–100), `skills_verified[]`, `task_progress[]`, `metadata` not sent
5. **Extra/Undocumented Fields** — `source`, `event_type`, `player.display_name`, `player.external_id`, `awarded_points`, `X-Source-App` header
6. **RLS Consideration** — `challenge_tasks` table must allow anon SELECT for academy import
7. **Recommendations** — Prioritized action items with ownership suggestions
8. **Questions for Academy Team** — Open items needing clarification

### Execution
- Write a Python script using `reportlab` to generate a styled PDF
- Output to `/mnt/documents/fgn-academy-gap-analysis.pdf`
- QA via `pdftoppm` image conversion and inspection

### Files
No project files changed — this is a standalone artifact.

