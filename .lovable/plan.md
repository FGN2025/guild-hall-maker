

# Add Registration Button to Embedded Calendar

## Overview
Add a call-to-action button at the bottom of the embedded calendar that links users to the application's registration page.

## Changes

### `src/pages/EmbedCalendar.tsx`
- Add a "Join Now" / "Sign Up" button below the calendar grid
- Link opens `https://play.fgn.gg/auth` in a new tab (using `target="_blank"`) so it doesn't navigate inside the iframe
- Style the button using the calendar's `primaryColor` for brand consistency

The button will appear on all embedded calendars. No database or config changes needed — it uses the existing production base URL constant.

