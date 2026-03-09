

## Fix Asset Variant Card Button Overflow

The issue is that the button row inside each asset card's `CardContent` overflows horizontally. The badge + 4 buttons (Customize, Save, Download) are laid out in a single `flex` row with no wrapping, causing the Download button to bleed past the card boundary.

### Change

**`src/pages/tenant/TenantMarketingDetail.tsx`** (lines 110-112):
- Change the `CardContent` from a single horizontal row to a stacked layout: badge on top, buttons below
- Make the button container use `flex-wrap` so buttons wrap to a new line on narrow cards instead of overflowing
- Specifically: replace `flex items-center justify-between` with `space-y-3`, and add `flex flex-wrap gap-2` on the button group

This ensures buttons never bleed outside the card regardless of card width.

