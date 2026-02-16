
# Add PDF Export Option to AI Coach Download

## What Changes
Replace the single download button with a dropdown menu offering two export formats: Markdown (.md) and PDF (via browser print).

## User Experience
- The download icon button becomes a dropdown trigger
- Clicking it shows two options: "Download as Markdown" and "Download as PDF"
- Markdown works as before (direct .md file download)
- PDF opens a styled print-ready HTML document in a new tab and triggers the browser's print dialog (same proven approach used in Season Stats and legal pages)

## Technical Details

### File: `src/components/CoachFloatingButton.tsx`

1. **Add `FileText` icon import** from lucide-react (for the PDF menu item)

2. **Add `handleExportPdf` function** that:
   - Builds a styled HTML document with the conversation formatted nicely (game name header, date, messages styled as a chat log)
   - Opens it in a new browser tab via `window.open`
   - Triggers `window.print()` after a short delay (same pattern as `src/lib/exportSeasonStats.ts`)

3. **Replace the single Download button** (line 182) with a `DropdownMenu` containing two `DropdownMenuItem` entries:
   - "Markdown (.md)" -- calls existing `handleExport`
   - "PDF" -- calls new `handleExportPdf`
   - The trigger remains the same ghost icon button with the Download icon

### PDF HTML template style
- Clean, print-friendly layout matching the existing Season Stats PDF approach
- User messages right-aligned or prefixed with "You:", coach messages prefixed with "Coach:"
- Header with game name and export date
- `@media print` CSS for clean output

No new files or dependencies needed.
