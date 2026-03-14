

## Plan: Add AI Enhance Buttons + Media Library Image Upload to Server Form

### Overview
Add "Enhance with AI" buttons for Description and Connection Instructions fields, and replace the plain Image URL text input with an image upload section supporting both desktop file upload and Media Library picker — matching the pattern used in Challenges and Quests.

### Changes

**1. New Edge Function: `supabase/functions/enhance-server-description/index.ts`**
- Accepts `name`, `game_name`, `description`, `connection_instructions`, `field` (which field to enhance: "description" or "connection_instructions")
- For description: generates an engaging server description referencing the game and server name
- For connection instructions: generates clear step-by-step join instructions for the specific game
- Uses Lovable AI Gateway with `google/gemini-3-flash-preview`

**2. `src/pages/admin/AdminGameServers.tsx` — ServerFormDialog updates**

*AI Enhance:*
- Add an "Enhance" button next to the Description label (calls edge function with `field: "description"`)
- Add an "Enhance" button next to the Connection Instructions label (calls edge function with `field: "connection_instructions"`)
- Both follow the existing pattern: `Sparkles` icon, disabled when name is empty, loading state with `Loader2`

*Image Upload:*
- Replace the `Image URL` text input with a proper image section containing:
  - A file upload button (`<input type="file" accept="image/*">`) for desktop uploads (uploads to `app-media` storage bucket)
  - A "Media Library" button that opens `MediaPickerDialog`
  - A small preview thumbnail when an image is set
- Uses `useMediaLibrary` upload function or direct storage upload for desktop files

### Files

| File | Action |
|------|--------|
| `supabase/functions/enhance-server-description/index.ts` | New — AI enhance for server descriptions and connection instructions |
| `src/pages/admin/AdminGameServers.tsx` | Update form: add Enhance buttons + image upload/media picker |

