

## Fix Calendar Image Visibility

### Problem
The promotional image below the calendar is barely visible against the dark background — same issue as the filter badges earlier. It needs a contrasting container to stand out.

### Solution
Wrap the image in a frosted-glass container with a dark semi-opaque background, blur, and a visible border — matching the pattern used for filter sections.

### Change — `src/pages/TournamentCalendar.tsx` (lines 169–175)

Replace the current plain `div` wrapper with a styled container:

```tsx
<div className="mt-8 flex justify-center">
  <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl p-4">
    <img
      src="/images/April_2026_calendar_square.png"
      alt="FGN Tournaments - April 2026"
      className="w-full max-w-2xl rounded-lg"
    />
  </div>
</div>
```

This adds:
- `bg-black/50` — dark overlay behind the image for contrast
- `backdrop-blur-sm` — frosted glass effect
- `border border-white/20` — visible white border
- `p-4` — padding so the image doesn't touch edges

### Files changed

| File | Change |
|------|--------|
| `src/pages/TournamentCalendar.tsx` | Wrap image in frosted-glass container for visibility |

