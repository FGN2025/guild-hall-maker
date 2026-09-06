# Guest Experience Assessment + Marketing Optimization

## Goal
Audit everything a non-registered visitor (prospective player, ISP/tenant prospect, or partner) can see across every public surface of FGN, then implement marketing improvements that convert guests without exposing internal platform mechanics.

## Current state (verified)
- Homepage (`/`): hero, Common Ninja ticker, featured video, featured events, footer links — no auth required, but no guest-targeted messaging, social proof, or signup funnel beyond the hero buttons.
- Guest-readable content via anon access: active quests, featured tournaments, game list, public tenant pages (`/events/:tenantSlug`, `/pages/:tenantSlug/:pageSlug`), calendar embeds, For Providers page, white paper.
- Guests hitting gated routes (tournaments, challenges, leaderboard, prize shop, community) get bounced by `ProtectedRoute` — the guest sees a login wall with no preview of what's inside.
- Tenant event pages are public and SEO-tagged (JSON-LD) but are pure listings — no "powered by FGN" upsell path for ISP prospects.
- Anon data exposure: safe views exist (`profiles_public`, `tenants_public`, `social_connections_safe`, `media_library_public`), but a full audit is needed to confirm no deep platform data (registration counts, tenant internals, subscriber data) leaks to guests.

## Phase 1 — Assessment report (read-only)
1. Enumerate every route reachable without a session and screenshot the guest experience at each (homepage, `/events/:slug`, `/for-providers`, `/white-paper`, `/pages/...`, embed calendar).
2. For each gated route, record exactly what a guest sees today (redirect vs. teaser).
3. Query every anon-readable table/view and confirm the column surface is marketing-safe (no emails, counts shielded per platform rules, no subscriber data).
4. Check head metadata (title/description/OG) on each public page for search/social readiness.
5. Deliver a written report: what guests see, what leaks, where marketing opportunities are missed.

## Phase 2 — Improvements (after report review)
1. Homepage: add guest-facing sections — live stats strip (players, tournaments run, prizes awarded, from safe views), "How it works" trio, ISP partner callout linking to `/for-providers`, stronger signup CTA.
2. Gated routes: replace bare login walls with teaser previews — guests see a read-only sample of tournaments/challenges/leaderboard content (anon reads already allowed) with a "Sign up to compete" overlay instead of a hard redirect.
3. Tenant event pages: add a subtle "Powered by Fiber Gaming Network — bring this to your community" footer linking to `/for-providers`.
4. Metadata: ensure every public page has a unique title/description and OG tags; add JSON-LD where missing.
5. Guardrails: any new guest-visible data uses existing safe views or new `security_invoker` views with column-limited anon grants — no new exposure of registration counts, tenant internals, or user PII.

## Technical details
- Frontend only for Phase 2 items 1–4; Phase 2 item 5 may add read-only DB views (with GRANT + `security_invoker=true` per project rules).
- No changes to auth flows, RLS policies on existing tables, or any tenant/player data.
- Palette and dark cyber aesthetic per brand guide; arcade mode is the default guest experience.
- No notifications or announcements to players about these changes.

## Deliverables
- Guest-experience assessment report (Phase 1).
- Implemented homepage, teaser-gate, tenant-page, and metadata improvements (Phase 2).
