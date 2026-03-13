

## Plan: Sticky Page Headers on All Pages

### Scope
Apply sticky headers to **all** pages that have a heading section, not just those with filter bars. This covers ~15 pages.

### Approach
Wrap each page's header block in a sticky container that stays pinned at the top of the scrollable `<main>` area. The container uses `backdrop-blur` and a semi-transparent background to remain legible over content that scrolls beneath it.

**Sticky wrapper pattern:**
```tsx
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pt-0 pb-4">
  {/* PageHero (if present) */}
  {/* Title / subtitle */}
  {/* Filter bar (if present) */}
  {/* Result count (if present) */}
</div>
```

The negative margin + padding trick ensures the sticky area spans edge-to-edge within the content padding set by `AppLayout`.

### Pages to Update

| Page | Header content to make sticky |
|------|-------------------------------|
| Games | Hero + title + filter bar + count |
| Tournaments | Hero + title + filter bar + count |
| Challenges | Title + description + filters |
| Quests | Title + description + filters |
| Leaderboard | Hero + title + filters |
| Prize Shop | Hero + title + description + filters |
| Ladders | Title + description |
| Community | Hero + title + create button |
| Dashboard | Hero + title |
| Achievements | Hero + title + description |
| Season Stats | Hero + title |
| Tournament Calendar | Title + month nav |
| Player Comparison | Title |
| Player Profile | Back link + profile header |
| Profile Settings | Title |
| Game Detail | Back link + title |

### Changes Summary

| What | Detail |
|------|--------|
| **~16 page files** | Wrap header sections in the sticky container div |
| **No new components** | Inline wrapper using existing Tailwind utilities |
| **No layout changes** | `AppLayout` already has `overflow-auto` on `<main>`, so `sticky` works natively |

