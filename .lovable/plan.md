

## Fix AI Coach Download Not Triggering

### Root Cause

The download handler creates an `<a>` element and calls `.click()` without appending it to the DOM. In sandboxed/iframe environments (like the Lovable preview), browsers may silently block programmatic clicks on detached elements.

### Fix

**`src/components/CoachFloatingButton.tsx`** — In both `handleExport` (line 235) and `handleExportPdf` (line 252):

1. **Markdown export** — Append the anchor to `document.body` before clicking, then remove it:
   ```typescript
   const a = document.createElement("a");
   a.href = url;
   a.download = `ai-coach-...`;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
   ```

2. **PDF export** — The current approach opens a new window and calls `window.print()`. This works for printing but doesn't produce a file download. No change needed here since it's a print-to-PDF flow (browser print dialog).

Single file, ~3 lines added to `handleExport`.

