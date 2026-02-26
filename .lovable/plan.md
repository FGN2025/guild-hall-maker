

## Add CommonNinja Ticker Embed with Admin Management

### Overview
Add a CommonNinja ticker widget between the Hero section and the Featured Video on the landing page. Store the embed HTML in the `app_settings` table so admins can change or remove it from the Settings page.

### 1. Insert a new `app_settings` row for the ticker embed
Insert a row with `key = "homepage_ticker_embed"` and `value` set to the provided CommonNinja embed HTML.

### 2. Create a `TickerEmbed` component (`src/components/TickerEmbed.tsx`)
- Fetch the `homepage_ticker_embed` value from `app_settings`
- If empty/null, render nothing
- Use `useEffect` to dynamically inject the CommonNinja SDK script (`https://cdn.commoninja.com/sdk/latest/commonninja.js`) into the document head (only once)
- Render the embed HTML using `dangerouslySetInnerHTML`
- Wrap in a styled section that matches the page layout (container, padding, etc.)
- After rendering the HTML, trigger CommonNinja to re-scan by dispatching or re-adding the script

### 3. Add `TickerEmbed` to the landing page (`src/pages/Index.tsx`)
- Import and place `<TickerEmbed />` between `<HeroSection />` and `<FeaturedVideo />`

### 4. Add Ticker Embed setting to Admin Settings (`src/pages/admin/AdminSettings.tsx`)
- Add a new state variable `tickerEmbed` for the embed code
- Fetch `homepage_ticker_embed` alongside the other settings in the existing `useEffect`
- Add a new card section with:
  - A `Code` icon and "Homepage Ticker Embed" label
  - Helper text explaining this is raw HTML/script embed code displayed above the Featured Video
  - A `Textarea` for pasting embed HTML
  - A Save button that upserts the value to `app_settings`

### Technical Details

**TickerEmbed component approach:**
- The CommonNinja SDK script is loaded once via a `<script>` tag appended to `document.head`
- The embed div is rendered with `dangerouslySetInnerHTML` so CommonNinja's SDK can find and initialize the `commonninja_component` div
- A `useEffect` with a MutationObserver or script re-trigger ensures the widget initializes after React renders the DOM

**Admin Settings additions:**
- New state: `tickerEmbed`, `savingTicker`
- Fetched in parallel with the existing settings queries
- Save uses `upsert` (insert on conflict update) to handle the case where the row doesn't exist yet

**Security note:** Only admins can write to `app_settings` (existing RLS policy), so the embed code is admin-controlled. The embed HTML is rendered on the public landing page.

