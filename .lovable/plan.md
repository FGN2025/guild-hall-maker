

## Assessment: Featured Events as a Web Page Section Type

### What We're Evaluating
Adding a new "Featured Events" section type to the web page builder so tenant marketing pages can embed a live feed of featured tournaments, challenges, and quests.

### Existing Infrastructure
The web page builder already has a clean plugin-like architecture:
- **`SECTION_TYPES`** array in `useWebPages.ts` — defines available section types
- **`AddSectionDialog`** — renders the picker (the dialog in your screenshot)
- **`SectionEditor`** — config form per section type (switch/case)
- **`SectionPreview`** — live preview per section type (switch/case)
- **`exportWebPage.ts`** — HTML export per section type (switch/case)

Adding a new section type means adding a case to each of these 4 touch points, plus registering it in `SECTION_TYPES`.

### Level of Effort: **Low-Medium** (~5 files, no DB migration)

#### Files to Modify
| File | Change |
|------|--------|
| `src/hooks/useWebPages.ts` | Add `featured_events` to `SECTION_TYPES` array |
| `src/components/webpages/AddSectionDialog.tsx` | Add icon mapping for `featured_events` |
| `src/components/webpages/SectionEditor.tsx` | Add config form (minimal — optional max count, optional type filter) |
| `src/components/webpages/SectionPreview.tsx` | Add case that renders a live `FeaturedEvents`-style grid using a Supabase query |
| `src/lib/exportWebPage.ts` | Add static HTML rendering for the export case |

#### Config Options (stored in `section.config`)
- `max_items` — optional limit (e.g. show only 3)
- `types` — optional filter array: `["tournament", "challenge", "quest"]`
- `show_stats` — boolean to show/hide the stat boxes

#### Key Considerations
- **Preview & Published pages**: `SectionPreview` already renders live — the new case can reuse the same query logic from `FeaturedEvents.tsx`
- **HTML Export**: The export would need to snapshot current featured events at export time (static HTML), since the exported file can't run queries. This is a minor limitation worth noting.
- **No database changes needed** — the `web_page_sections` table already stores arbitrary JSON config, and the featured events data comes from existing `is_featured` columns.

### Summary
This is a straightforward addition following an established pattern. The main work is creating the preview renderer (reusing `FeaturedEvents` query logic) and the static HTML export fallback. Estimated ~1-2 hours of implementation.

