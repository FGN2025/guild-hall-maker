

## AI-Enhanced Quest Narratives

### Summary
Add "Enhance with AI" buttons to the Story Intro and Story Outro fields in both Create and Edit Quest dialogs. The AI will use the quest name, game name, difficulty, description, and optionally RAG context from a game-specific Open Notebook to generate professional narrative text.

### Key Design Decisions

**1. Notebook-to-Game Mapping**
Currently `admin_notebook_connections` has no `game_id` column — notebooks are global. To enable game-specific RAG, we add an optional `game_id` FK so admins can associate a notebook with a specific game (e.g., the "Valorant Guides" notebook maps to the Valorant game). When generating quest narratives, the system will search only the notebook(s) linked to the selected game.

**2. Edge Function: `enhance-quest-narrative`**
A new backend function (modeled on `enhance-challenge-description`) that:
- Accepts: `name`, `description`, `game_name`, `difficulty`, `challenge_type`, `field` ("intro" or "outro"), `draft` (existing text), `game_id` (optional)
- If `game_id` is provided, queries `admin_notebook_connections` for notebooks linked to that game, searches them via the notebook API for relevant lore/context
- Builds a prompt with all context and calls Lovable AI to generate the narrative
- Returns `{ enhanced_text: "..." }`

**3. Frontend: Sparkle Buttons on Story Fields**
Both CreateQuestDialog and EditQuestDialog get a small "Enhance" button (Sparkles icon) next to the Story Intro and Story Outro labels. Clicking it:
- Calls the edge function with current form state
- Shows a loading spinner on the button
- Populates the textarea with the AI-generated text (user can edit after)
- Disabled if quest name is empty (minimum context needed)

### Database Change
Single migration:
```sql
ALTER TABLE admin_notebook_connections
  ADD COLUMN game_id uuid REFERENCES games(id) ON DELETE SET NULL;
```
This is nullable — existing notebooks remain global. Admins can optionally link a notebook to a game via the existing Notebooks management page.

### Files to Create
- `supabase/functions/enhance-quest-narrative/index.ts` — edge function with notebook RAG + AI generation

### Files to Edit
- `src/components/quests/CreateQuestDialog.tsx` — add Enhance buttons on story_intro and story_outro
- `src/components/quests/EditQuestDialog.tsx` — same Enhance buttons
- `src/pages/admin/AdminNotebooks.tsx` — add optional Game selector to the Add/Edit connection form
- `src/hooks/useNotebookConnections.ts` — include `game_id` in the interface and mutations
- `supabase/config.toml` — register the new edge function with `verify_jwt = false`

### Edge Function Logic (Pseudocode)
```
1. Parse input (name, description, game_name, difficulty, type, field, draft, game_id)
2. If game_id provided:
   a. Query admin_notebook_connections where game_id matches and is_active
   b. For each matching notebook, POST /api/search with query = "{name} {description}"
   c. Collect top 3-5 relevant passages as RAG context
3. Build system prompt:
   - "You are a lore writer for a gaming community..."
   - If field = "intro": "Write an immersive narrative that sets the stage..."
   - If field = "outro": "Write a satisfying conclusion narrative..."
4. Build user prompt with: quest name, game, difficulty, type, draft text, RAG passages
5. Call Lovable AI gateway (non-streaming)
6. Return enhanced_text
```

### UI Behavior
- Button shows "✨ Enhance" with Sparkles icon
- While generating: shows spinner, button disabled
- On success: textarea populated with result, toast "Narrative generated"
- On error: toast with error message
- User can always manually edit the generated text

### Admin Notebooks Page Update
The "Add Connection" dialog gains an optional "Game" dropdown. This lets admins associate a notebook with a specific game so the quest narrative AI can pull game-specific context.

### Implementation Order
1. Database migration (add `game_id` to notebook connections)
2. Edge function (`enhance-quest-narrative`)
3. Admin Notebooks UI (game selector)
4. Create/Edit Quest dialog (Enhance buttons)

