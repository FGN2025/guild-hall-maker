

## Preserve Multi-line Descriptions on Tournament Cards

### Problem
Tournament descriptions with line breaks (entered via the textarea) render as a single paragraph because `<p>` tags collapse whitespace. Users expect their formatting to be preserved. Additionally, the card description area should always occupy exactly 2 lines of space for visual consistency — scrollable if longer, padded if shorter.

### Changes

**6 files** need the same pattern applied to description rendering:

#### 1. Grid card descriptions (4 files)
These all currently use `<p className="... line-clamp-2">{t.description}</p>`:

- `src/components/tournaments/TournamentCard.tsx` (line 64-66)
- `src/pages/admin/AdminTournaments.tsx` (line 251-253)
- `src/pages/moderator/ModeratorTournaments.tsx` (line 262-264)

**Change:** Replace the `<p>` with a fixed-height `<div>` (2 lines tall, ~2.5rem) that uses `overflow-y-auto` and `whitespace-pre-line` to preserve newlines and allow scrolling:

```tsx
<div className="text-xs text-muted-foreground mb-4 h-[2.5rem] overflow-y-auto whitespace-pre-line">
  {t.description || "\u00A0"}
</div>
```

- `whitespace-pre-line` preserves line breaks from the textarea
- Fixed height ensures 2-line consistency regardless of content length
- `overflow-y-auto` enables scrolling for longer descriptions
- Always rendered (not conditionally) — shows blank space when empty

#### 2. Detail dialogs / full views (3 files)
These show the full description without truncation:

- `src/components/tournaments/TournamentDetailsDialog.tsx` (line 43-45)
- `src/pages/admin/AdminTournaments.tsx` (line 317-319)
- `src/pages/moderator/ModeratorTournaments.tsx` (line 324-326)
- `src/pages/TournamentDetail.tsx` (line 131-135)

**Change:** Add `whitespace-pre-line` to preserve line breaks in full views:

```tsx
<p className="text-sm text-muted-foreground whitespace-pre-line">{t.description}</p>
```

