

## Add Buffering to Tournament Detail Page

The tournament detail page's outer container (`space-y-6`) has no padding, causing content to touch the viewport edges.

### Change

**`src/pages/TournamentDetail.tsx`** (line 87):
- Add horizontal and vertical padding to the outer `div`: change `className="space-y-6"` to `className="space-y-6 p-4 md:p-6"` so content has consistent inset from the edges on all screen sizes.

