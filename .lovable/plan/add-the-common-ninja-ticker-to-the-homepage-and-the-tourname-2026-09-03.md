# Add the Common Ninja ticker to the homepage and the Tournaments page

## Current state (verified)

- `AdminSettings.tsx` already has a "Homepage Ticker Embed" field that saves raw HTML to `app_settings.homepage_ticker_embed`.
- That key already holds exactly the div you provided:
  `<div class="commonninja_component pid-224b8aef-f0e7-4794-9adb-50c00868aadb"></div>`
- The key is world-readable via the "Public can read UI settings only" RLS policy, so guests can load it too.
- However, **nothing currently renders it** — no component reads that setting, so the ticker is not actually visible on the homepage today.

## What to build

### 1. Shared `TickerEmbed` component (`src/components/TickerEmbed.tsx`)

- Fetches `app_settings.homepage_ticker_embed` via the Supabase client (same pattern HeroSection uses for `hero_logo_url`).
- Renders the stored HTML with `dangerouslySetInnerHTML` (setting is admin-write-only, so this is safe).
- Injects `<script src="https://cdn.commoninja.com/sdk/latest/commonninja.js" defer>` into `document.head` once (guarded against duplicates, since two instances of the component will mount on different routes).
  - Necessary because `<script>` tags inside `dangerouslySetInnerHTML` do not execute.
- Renders nothing when the setting is empty.

### 2. Homepage (`src/pages/Index.tsx`)

- Render `<TickerEmbed />` between `HeroSection` and `FeaturedVideo` — matching the Admin Settings description ("displayed between the Hero section and Featured Video on the homepage").

### 3. Tournaments page (`src/pages/Tournaments.tsx`)

- Render `<TickerEmbed />` at the top of the page content, just below `PageBackground` and above the sticky header block, so it appears at the top of the page on both guest and signed-in views.

## Technical notes

- No database or migration changes — the setting, the saved embed code, and the public-read RLS policy already exist.
- No Admin Settings changes — the existing field continues to control the ticker on both pages (clearing it hides both).
- Verify afterwards: ticker visible at top of `/tournaments` and between hero and video on `/` for a guest.
