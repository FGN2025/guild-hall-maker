## Context

The AI Writer outputs Markdown into `games.guide_content`. End users **already see it formatted** — `src/pages/GameDetail.tsx` (line 120) renders it with `ReactMarkdown` inside a styled `prose` container, so headings, bullets, bold, code, etc. all look correct on the player-facing Game Detail page.

The only place Markdown still appears as raw text (`## Heading`, `- bullet`) is inside the **AI Writer preview itself** (`GuideWriterDialog.tsx`), which uses a plain `<Textarea>`. That's why it feels unformatted — admins are looking at the editor, not the rendered output.

## What to change

Add a **Rendered / Markdown toggle** to the preview area in `GuideWriterDialog.tsx` so admins can see exactly how the guide will look to players before clicking Apply.

### UI

In the preview section (only shown after a generation):

- A small `Tabs` control above the preview with two tabs:
  - **Rendered** (default) — shows the Markdown formatted using the same `ReactMarkdown` + `prose` styling block that `GameDetail.tsx` uses, so it matches the player view 1:1.
  - **Markdown** — shows the existing editable `<Textarea>` (so admins can still tweak the source before applying).
- The "Apply to User Guide" button keeps applying the current Markdown source — editing only happens in the Markdown tab.

### Files

- `src/components/games/GuideWriterDialog.tsx` — wrap the preview in `Tabs`, import `ReactMarkdown`, copy the `prose` className from `GameDetail.tsx` so the preview matches the player view exactly.

No changes to the edge function, the database, or `AddGameDialog.tsx`. The "User Guide" field on the edit form stays a raw Markdown textarea (it's the editor), and the player-facing render is already formatted.

## Out of scope

- Replacing the User Guide textarea on the Add/Edit Game form with a WYSIWYG editor (separate, larger change — ask if you want this too).
- Changing the player-facing render (already formatted).
