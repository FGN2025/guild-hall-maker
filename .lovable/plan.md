

## Plan: Improve Background Visibility & Auto-Assign Banner Images

### Two Problems to Fix

**1. Backgrounds are too dim**
The `PageBackground` component applies double dimming:
- Image opacity defaults to 50% (`opacity: 0.50`)
- A heavy gradient overlay on top: `from-background/60 via-background/80 to-background`

Combined, the background is barely visible. Fix: lighten the gradient to `from-background/30 via-background/50 to-background/90` and raise the default opacity to `0.65`.

**2. Many pages have no background at all**
12 pages have `<PageBackground>`, but ~10 pages (Games, PlayerProfile, PlayerComparison, GameDetail, Stats, TournamentDetail, TournamentBracket, TournamentCalendar, ProfileSettings, PlayerGuide) do not.

### Changes

#### A. `src/components/PageBackground.tsx` — Improve visibility
- Lighten the gradient overlay from `from-background/60 via-background/80 to-background` to `from-background/30 via-background/50 to-background/90`
- This keeps bottom readability but lets the image show through much more at the top

#### B. `src/hooks/usePageBackground.ts` — Raise default opacity
- Change default upsert opacity from `0.50` to `0.65`

#### C. `src/components/PageBackground.tsx` — Auto-fallback from Media Library banners
When no `page_backgrounds` row exists for a page, fall back to a banner image from the Media Library. The component will:
- Query `media_library` for items with `category = 'banner'` and `file_type = 'image'`
- Use the page slug to deterministically pick a different banner for each page (hash the slug to an index)
- Render with the default opacity (0.65)

This ensures every page gets a background even without admin configuration.

#### D. Add `<PageBackground>` to missing pages
Add the component to these pages that currently lack it:
| Page | Slug |
|------|------|
| `Games.tsx` | `games` |
| `PlayerProfile.tsx` | `player-profile` |
| `PlayerComparison.tsx` | `compare` |
| `GameDetail.tsx` | `games` |
| `TournamentDetail.tsx` | `tournaments` |
| `TournamentBracket.tsx` | `tournaments` |
| `TournamentCalendar.tsx` | `calendar` |
| `ProfileSettings.tsx` | `profile` |
| `PlayerGuide.tsx` | `guide` |

Each page will need `relative` on its container and `relative z-10` on its content wrapper.

### Files Modified
| File | Change |
|------|--------|
| `src/components/PageBackground.tsx` | Lighten gradient, add banner fallback query |
| `src/hooks/usePageBackground.ts` | Default opacity 0.50 → 0.65 |
| 9 page files | Add `<PageBackground>` + layout wrappers |

### Technical Detail: Deterministic Banner Cycling
```typescript
// Simple hash to pick a different banner per page
const index = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % banners.length;
```
This ensures each page gets a consistent but different banner without any admin setup.

