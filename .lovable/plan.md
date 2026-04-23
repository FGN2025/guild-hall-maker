

# Plan: Admin AI Coach Source Management

## Summary
Enhance the Admin Notebooks page to give admins full visibility and control over the AI Coach's knowledge sources, and fix the game-scoped search so the coach prioritizes relevant notebooks.

## Changes

### 1. Add "Browse Sources" panel to AdminNotebooks
- For each connection card, add a "Sources" button that opens a dialog listing all documents/sources in that notebook (calls the existing `notebook-proxy` `sources` action)
- Display source name, type, and size where available
- No new edge function needed -- the proxy already supports this

### 2. Add "Test Search" dialog
- Add a search input on the AdminNotebooks page where admins can type a query and see the ranked results the coach would retrieve
- Calls the existing `notebook-proxy` `search` action with the connection's notebook ID
- Shows result snippets with source attribution so admins can verify quality

### 3. Add Edit Connection support
- Add an "Edit" button to each connection card opening a pre-filled dialog
- Allow changing name, API URL, notebook ID, and game assignment
- Uses the existing `updateConnection` mutation from `useNotebookConnections`

### 4. Fix game-scoped notebook search in ai-coach
- Currently `searchNotebooks()` queries ALL active connections regardless of the selected game
- Modify the function to accept a `game_id` parameter
- When a game is selected, prioritize connections linked to that game (search those first, then fall back to global/unlinked notebooks if under the result cap)
- This ensures game-specific notebooks are weighted correctly

### 5. Add "Notes" viewer (read-only)
- For each connection, add a "Notes" button to view saved notes in the notebook (calls existing `notebook-proxy` `notes` action)
- Read-only display since note creation happens in Open Notebook directly

## Files to create
- None (all changes to existing files)

## Files to modify
- `src/pages/admin/AdminNotebooks.tsx` -- Add Sources dialog, Search dialog, Edit dialog, Notes viewer
- `supabase/functions/ai-coach/index.ts` -- Add game-scoped notebook filtering to `searchNotebooks()`
- `src/hooks/useNotebookConnections.ts` -- Add `fetchSources`, `fetchNotes`, `searchNotebook` helper functions

## Database changes
- None required (all infrastructure already exists)

## Technical details
- The `notebook-proxy` already has `sources`, `notes`, and `search` POST actions -- the admin UI just needs to call them via `supabase.functions.invoke("notebook-proxy", { body: {...} })`
- Game-scoped search: query `admin_notebook_connections` with `game_id` filter first, then `game_id IS NULL` for global notebooks, respecting the existing `MAX_TOTAL=8` cap
- Edit dialog reuses the same form layout as the Add dialog but pre-populates fields

