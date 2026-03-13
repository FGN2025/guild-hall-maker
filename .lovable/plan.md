

## Plan: Add Rounded Corners to Video and Ticker Sections

### Current State
- **Featured Event cards**: Already use `rounded-xl` (12px border radius) — the target style.
- **Featured Video**: The inner wrapper at line 54 already has `rounded-xl border border-border overflow-hidden` — so the video embed itself is rounded, but the outer section has no rounding.
- **Ticker**: Has no rounding at all — the `dangerouslySetInnerHTML` div is unstyled.

### Changes

**`src/components/TickerEmbed.tsx`**
- Wrap the embed div with `rounded-xl border border-border overflow-hidden bg-card` to match the video and card styling.

**`src/components/FeaturedVideo.tsx`**
- The video container already has `rounded-xl`. No change needed here — it already matches the Featured Event cards.

Looking at the screenshot more closely: the video does appear rounded already. The ticker is the one that bleeds edge-to-edge without rounding. So the change is just the ticker.

### Single File Change
| File | Change |
|------|--------|
| `src/components/TickerEmbed.tsx` | Add `rounded-xl border border-border overflow-hidden bg-card` to the embed container div |

