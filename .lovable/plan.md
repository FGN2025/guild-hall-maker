## P1 — Skill Passport link-out (Play side), config-driven URL

### Context
- Decision: **link-out only** from `/dashboard`, no in-app passport render.
- Current button hits `https://fgn.academy/passport?email=<urlencoded>` and 404s.
- URL/auth contract is now logged as **§9 P1 BLOCKER** in `docs/phase-f-status-and-open-asks.md` (Option A: canonical slug URL, Option B: HMAC magic-link — Option B preferred).
- Academy still owes the explicit decision per §9. Nothing on Play hard-codes either choice yet.

### Goal
Land Play's Skill Passport link-out in a shape that can flip to Academy's final answer **via config only, no redeploy**, while the §9 decision is pending. Today's button still 404s, so step 2 also gives us a less-broken interim default.

### Step 1 — Make the URL fully config-driven
Edit `src/lib/academyPassport.ts` to read additional knobs from the active `tenant_integrations` row (`provider_type = 'fgn_academy'`, `is_active = true`):

- `passport_base_url` (already supported) — host root, default `https://fgn.academy`.
- `passport_path_template` (new) — e.g. `/passport/{slug}` or `/passport?email={email}`. Supports placeholders: `{email}`, `{external_user_id}`, `{slug}`. Default kept as `/passport?email={email}` until §9 lands.
- `passport_link_mode` (new) — `"direct" | "magic_link"`. Default `"direct"`.

Direct mode: substitute placeholders against `{ email, external_user_id, slug }` resolved from the current user (email from auth, external_user_id from `profiles`/sync metadata, slug from a future Academy lookup). Missing placeholder → fall back to email.

Hook surface stays `useAcademyPassportUrl(...)` returning a string URL, so `Dashboard.tsx` doesn't change in direct mode.

### Step 2 — Magic-link path (only wired up; dormant until Academy picks Option B)
Add edge function `supabase/functions/academy-passport-link/index.ts`:
- Loads active `fgn_academy` integration.
- Resolves caller's `email` + `external_user_id` from session.
- POSTs to Academy's magic-link endpoint (URL from `additional_config.passport_magic_link_endpoint`) with `X-Play-Signature` HMAC-SHA256 over the canonical body, reusing the **§6-finalized scheme** and `PLAY_WEBHOOK_SECRET`.
- Returns `{ url }`.

In `passport_link_mode === "magic_link"`, `Dashboard.tsx` invokes the function on click and opens `data.url` in a new tab; show a toast on failure. Do NOT pre-resolve on hover (avoid burning one-time tokens).

Function ships disabled-by-default (no config row points at it yet) so it's safe to land before Academy confirms.

### Step 3 — Update §9 with the Play-side delivery shape
Append to `docs/phase-f-status-and-open-asks.md` §9:

> **Play-side status (2026-05-11):** Link-out is now config-driven via `tenant_integrations.additional_config`:
> - `passport_base_url`, `passport_path_template` (placeholders: `{email}`, `{external_user_id}`, `{slug}`), `passport_link_mode` (`direct` | `magic_link`).
> - Option A (canonical URL): Academy confirms template → Play updates one config row, no redeploy.
> - Option B (magic-link): edge function `academy-passport-link` is shipped and dormant. To activate, Academy provides the endpoint URL + confirms it accepts the §6 HMAC scheme keyed on `external_user_id`; Play sets `passport_link_mode='magic_link'` + `passport_magic_link_endpoint=<url>` in the same row.
> - Today's default (`/passport?email={email}`) still 404s — pending §9 decision before we change the default.

### Step 4 — Verify on `/dashboard`
- Direct mode with default template: confirm button still opens (will still 404 until Academy answers §9 — expected).
- Direct mode with hand-set `passport_path_template='/passport/{email}'` via a temporary admin update: confirm URL is built correctly and opens in a new tab.
- Magic-link mode: covered by a follow-up smoke once Academy delivers the endpoint.

### Step 5 — Communications back to Academy devs
Single message in §9 update:

> Play P1 link-out is config-flipped, not code-flipped. We're holding on §9 — please confirm Option A or B and the missing fields:
> - Option A: final path template + lookup key (`email`, `external_user_id`, or `slug`) + slug-resolution endpoint if any.
> - Option B: magic-link endpoint URL + confirmation it accepts §6 `X-Play-Signature` (HMAC-SHA256, `PLAY_WEBHOOK_SECRET`) keyed on PR P-3 `external_user_id`.
> No Play redeploy needed once you answer — we flip a single `tenant_integrations` row.

### Out of scope (deferred)
- Rendering passport tiles/skills inside Play.
- Caching Academy passport data locally.
- Per-tenant overrides of the passport URL (current row is global; revisit if a partner needs a white-labeled Academy host).

### Files touched
- `src/lib/academyPassport.ts` — config-driven URL + optional async magic-link path.
- `src/pages/Dashboard.tsx` — minimal change to handle async click in magic-link mode (toast on failure).
- `supabase/functions/academy-passport-link/index.ts` (new) — dormant until Academy picks Option B.
- `docs/phase-f-status-and-open-asks.md` — §9 update with Play-side delivery shape + ask back to Academy.
