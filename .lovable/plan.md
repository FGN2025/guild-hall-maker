

# Improve Background Opacity for Embedded Calendar

The current background overlay in `EmbedCalendar.tsx` uses `bg-black/60` (60% black overlay). This can make the calendar cells hard to read depending on the background image. Increasing the overlay opacity and adjusting cell backgrounds will improve foreground clarity.

## Changes

### `src/pages/EmbedCalendar.tsx`

1. Change the background overlay from `bg-black/60` to `bg-black/75` for stronger dimming
2. Increase calendar cell backgrounds from `rgba(0,0,0,0.3)` to `rgba(0,0,0,0.55)` for better contrast
3. Increase empty padding cells similarly

These changes only affect the embed view when a background image is set — calendars without a background image are unaffected.

