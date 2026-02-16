

# Add Download/Export for AI Coach Conversations

## What Changes
Add a download button to the AI Coach header that exports the current conversation as a `.md` (Markdown) file. The button appears only when there are messages in the chat.

## User Experience
- A small download icon button appears in the header bar, next to the existing trash (clear) button
- Clicking it instantly downloads a `.md` file containing the full conversation
- The file is named with the game context and timestamp, e.g. `ai-coach-valorant-2026-02-16.md`
- The button only shows when there are messages (same visibility logic as the trash button)

## Technical Details

### File: `src/components/CoachFloatingButton.tsx`

1. Import `Download` icon from `lucide-react`
2. Add a `handleExport` function that:
   - Builds a Markdown string from `messages` array
   - Prefixes user messages with `**You:**` and assistant messages with `**Coach:**`
   - Adds a header line with game name and date
   - Creates a Blob, generates an object URL, triggers download via a temporary `<a>` element
3. Add a new `Button` (ghost, icon, same size as trash button) right next to the trash button in the header

### Export format example:
```
# AI Coach Chat — Valorant
_Exported on 2026-02-16_

---

**You:** How do I improve crosshair placement?

**Coach:** Here are some tips...

---

**You:** Best agents for solo queue?

**Coach:** For solo queue, consider...
```

No backend changes needed -- this is a pure client-side file download using the in-memory messages array.

