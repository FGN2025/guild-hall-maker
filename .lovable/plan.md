
## Fix AI Coach Export So It Works Even When Browser Downloads Are Blocked

### What’s happening
The current Markdown export already tries both:
1. `showSaveFilePicker`
2. hidden anchor download

But in preview/sandboxed iframe environments, **both can still be blocked silently**. That’s why nothing appears in Downloads even after the earlier fixes.

### Recommended fix
Make export use a **reliable fallback chain with visible user feedback**, instead of assuming the browser saved the file.

### Implementation plan

1. **Harden `handleExport` in `src/components/CoachFloatingButton.tsx`**
   - Keep `showSaveFilePicker` as the first option
   - If that fails, fall back to a blob URL anchor with:
     - `target="_blank"`
     - `rel="noopener"`
   - If that still fails or is blocked, fall back to opening the export content in a new tab/window as plain rendered text/HTML so the user can manually save it

2. **Add explicit success/error toasts**
   - “Save dialog opened”
   - “Download started”
   - “Your browser blocked automatic download — export opened in a new tab instead”
   - “Export cancelled”

3. **Add a last-resort manual export path**
   - Add a second action such as:
     - “Open Markdown in New Tab”
     - or “Copy Chat to Clipboard”
   - This guarantees users can still keep the conversation even when browser downloads are restricted

4. **Keep PDF behavior separate**
   - PDF currently uses print dialog, which is not a file download
   - Relabel or clarify that it is “Print / Save as PDF” so expectations are correct

### Why this is the right fix
The issue is no longer just the anchor element. The real problem is that the app is running in an environment where **automatic file downloads may be restricted**. The export flow needs a fallback that does not depend on the browser writing directly into Downloads.

### Files to update
- `src/components/CoachFloatingButton.tsx`

### Expected outcome
After this change, users will always get one of these outcomes:
- native save dialog
- direct download
- new tab with export content ready for manual save
- clear feedback explaining what happened

### Technical notes
- `showSaveFilePicker` only works in supported secure contexts and may be unavailable or restricted in embedded previews
- hidden anchor downloads can also be blocked inside iframe/sandbox environments
- opening a new tab with export content is the most dependable non-backend fallback when browser downloads are suppressed
