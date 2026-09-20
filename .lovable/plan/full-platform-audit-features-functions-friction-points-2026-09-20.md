# Full Platform Audit — Features, Functions, Friction Points

A read-only sweep of the whole product (player, guest, tenant, moderator, admin) ending in one prioritised list of issues and friction points. No code or data changes in this pass.

## Scope

Surfaces to review:

- **Guest / public**: home, games, tournaments, challenges hub, tenant event pages, white paper, for-providers, embeds, sign-up and email confirmation.
- **Player**: dashboard, challenges + Competitive Gaming, challenge detail and evidence upload, tournaments and brackets, leaderboard and season stats, prize shop and redemptions, achievements, profile and settings, Discord/Steam linking, notifications, AI coach.
- **Tenant (ISP) portal**: dashboard, players, leads, subscribers, events, challenges, marketing + assets, landing/web pages, branding, codes, team, integrations, billing, settings.
- **Moderator**: tournaments, matches, challenges, points, achievements, featured events, ladders, challenge generator.
- **Admin**: all 29 admin pages, plus ecosystem, notebooks, legacy import, agent prompts, points rubric/import.
- **Backend**: 98 edge functions — which are dead, unscheduled, silently failing, or missing auth; queue/cron health; open roadmap items.

## How each surface is checked

1. **Route and navigation sweep** — every route in `App.tsx` reached, confirming it loads, is reachable from a menu, and is gated by the right role. Flags orphan pages, dead menu entries, and 404s.
2. **Live browser pass** — Playwright walks the main flows for a guest, a player, a tenant admin and a platform admin, capturing console errors, empty states, broken images and confusing dead ends.
3. **Data reality check** — read-only queries comparing what the UI promises against what exists (empty categories, unscheduled queues, stuck rows, orphaned records, counts that never populate).
4. **Code review for known smells** — filters that can contradict each other, actions with no confirmation or feedback, forms without validation, stubs marked "coming soon", duplicated logic, and features whose buttons do nothing.

## Deliverable

A single audit report saved to Files, organised as:

- **Blocking** — broken or non-functional for the user who relies on it.
- **Friction** — works but confusing, slow, hidden, or missing feedback (per audience: guest, player, tenant, moderator, admin).
- **Inconsistency** — naming, layout, empty-state and terminology mismatches across similar screens.
- **Backend hygiene** — dead functions, unscheduled processors, silent failures, stale data.
- **Already-known / deferred** — cross-referenced against `docs/tech-debt.md` and `roadmap.md` so nothing is double-reported.

Each entry: what the user sees, where it happens, why it matters, and a suggested fix sized as small / medium / large. Nothing is fixed in this pass — you pick what to act on, and I turn the chosen items into a follow-up work plan.

## Technical notes

- Entirely read-only: browser checks against the local preview, `SELECT`-only database probes, static reads of edge functions and `config.toml`.
- Admin and tenant views are inspected with an authenticated session minted for a platform-admin account; no data is written.
- Security scan findings are out of scope here — those stay on the separate, explicitly-approved fix track.
