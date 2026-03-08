

## Tournament Rules: Freeform or Game Rules PDF

### Overview
Add a `tournament_rules_url` column to the `games` table so each game can have a PDF of standard tournament rules. In tournament create/edit forms, let users choose between freeform text or loading the game's PDF rules. In admin game management, add a PDF upload field.

### Database Change
- Add `tournament_rules_url text` column to `games` table (nullable, default null)

### Changes

#### 1. Admin Game Management (`AddGameDialog.tsx`)
- Add a "Tournament Rules PDF" upload field (file input accepting `.pdf`)
- Upload PDFs to `app-media` storage bucket under `game-rules/` prefix
- Store the public URL in `tournament_rules_url`
- Show current PDF link when editing, with option to replace

#### 2. Game type (`useGames.ts`)
- Add `tournament_rules_url: string | null` to the `Game` interface and related types

#### 3. Tournament Create/Edit Forms (`CreateTournamentDialog.tsx`, `EditTournamentDialog.tsx`)
- Replace the plain "Rules" textarea with a rules-mode toggle:
  - **Freeform** (default): existing textarea behavior
  - **Game Rules PDF**: when a game is selected and has `tournament_rules_url`, show a button to load/link those rules; the `rules` field stores a reference like `[PDF: <url>]` or the rules text is replaced with a note + link
- When the user selects a game that has a rules PDF, show an option to "Use game rules PDF" which sets the tournament's `rules` field to the PDF URL
- The freeform textarea remains available if they want to override or add custom rules

#### 4. Tournament Detail Views (`TournamentDetail.tsx`, `TournamentDetailsDialog.tsx`)
- Detect if `rules` contains a PDF URL (starts with `http` and ends with `.pdf`)
- If so, render a "View Tournament Rules (PDF)" link/button that opens in a new tab
- Otherwise render the text as-is with `whitespace-pre-line`

#### 5. Admin/Moderator tournament lists
- Same PDF detection logic for any inline rules display

### Files to edit
- `src/hooks/useGames.ts` — add field to interface
- `src/components/games/AddGameDialog.tsx` — PDF upload field
- `src/components/tournaments/CreateTournamentDialog.tsx` — rules mode toggle
- `src/components/tournaments/EditTournamentDialog.tsx` — rules mode toggle
- `src/pages/TournamentDetail.tsx` — PDF link rendering
- `src/components/tournaments/TournamentDetailsDialog.tsx` — PDF link rendering
- 1 database migration adding the column

