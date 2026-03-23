

## Add Game Selection to Coach File Uploads

When uploading files to the AI Coach profile, players must select which game the data relates to — either picking from the existing games catalog or entering a custom game name.

### Database Change

Add a `game_name` column to `coach_player_files`:

```sql
ALTER TABLE public.coach_player_files
  ADD COLUMN game_name text;
```

Nullable so existing files aren't broken.

### Frontend Changes

**`src/components/coach/CoachProfileCard.tsx`**
- Add a game selector that appears when the upload button is clicked (or inline next to it)
- Fetch active games from the `games` table for a dropdown
- Include an "Other" option that reveals a free-text input for unlisted games
- Store selected game name in state; pass it through to `uploadFile`
- Display the game name next to each file in the uploaded files list

**`src/hooks/useCoachProfile.ts`**
- Update `uploadFile` signature to accept `gameName: string`
- Insert `game_name` into the `coach_player_files` row
- Update `CoachFile` interface to include `game_name`

### Edge Function

**`supabase/functions/ai-coach/index.ts`**
- When injecting file metadata into the system prompt, include the game name so the AI knows which game each file's stats relate to

### UI Flow

1. Player clicks "Upload File"
2. A small inline form appears: game selector (dropdown of active games + "Other/custom" option) and the file picker
3. Both game and file are required before the upload proceeds
4. Uploaded files list shows game name as a badge/tag next to each file

