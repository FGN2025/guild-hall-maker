

## Player Coaching Profile — Optional Stats Upload for AI Coach

Allow each player to optionally maintain a "coaching profile" with self-reported stats, notes, and data that the AI coach reads during conversations. This is a per-player, self-managed feature — no admin involvement required.

### Overview

Players access a new "Coach Profile" section (either in Profile Settings or directly in the coach panel) where they can:
- Toggle personalized coaching on/off
- Enter free-text notes (play style, goals, weaknesses)
- Upload stat screenshots or data files (stored in Supabase Storage)
- View/delete their uploaded materials

The AI coach edge function reads this data and injects it into the system prompt when personalization is enabled.

### Database Changes

**New table: `coach_player_profiles`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid (FK profiles) | unique, not null |
| enabled | boolean | default false |
| notes | text | free-text: goals, play style, weaknesses |
| stats_summary | text | structured stats the player pastes in |
| created_at / updated_at | timestamptz | |

RLS: owner-only read/write (user_id = auth.uid()).

**New table: `coach_player_files`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | not null |
| file_name | text | original filename |
| file_url | text | storage URL |
| file_type | text | mime type |
| extracted_text | text | nullable — for future OCR/extraction |
| created_at | timestamptz | |

RLS: owner-only. Storage bucket `coach-uploads` (private, user-scoped paths).

### Frontend Changes

1. **New component: `CoachProfileCard`** — A card in Profile Settings with:
   - Toggle switch for "Enable personalized coaching"
   - Textarea for notes/goals (e.g., "I main Jett, struggle with post-plant")
   - Textarea for stats summary (e.g., paste win rates, K/D, rank)
   - File upload area for screenshots/data (max 5 files, images + CSV)
   - List of uploaded files with delete buttons
   - Save button

2. **Coach panel indicator** — Small badge/icon in the coach header showing when personalization is active, with a link to settings.

### Edge Function Changes

**`supabase/functions/ai-coach/index.ts`** — Before building the system prompt:
1. Query `coach_player_profiles` for the authenticated user
2. If `enabled = true` and data exists, inject a `## Player Profile` section into the system prompt containing their notes, stats summary, and any extracted text from uploads
3. The prompt instructs the AI to reference this data naturally without being repetitive

### Effort Estimate

- Database migration + RLS: ~30 min
- Storage bucket + upload logic: ~30 min
- CoachProfileCard component: ~1.5 hours
- Edge function integration: ~1 hour
- Testing: ~30 min
- **Total: ~4 hours**

