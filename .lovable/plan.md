

## Player Coaching Profile — Optional Stats Upload for AI Coach ✅

Implemented optional, per-player coaching profiles that feed personalized context into the AI Coach.

### What was built

1. **Database**: `coach_player_profiles` and `coach_player_files` tables with owner-only RLS policies
2. **Storage**: Private `coach-uploads` bucket with user-scoped RLS
3. **Frontend**: `CoachProfileCard` component in Profile Settings with toggle, notes, stats, and file upload
4. **Edge Function**: `ai-coach` now fetches player profile and injects into system prompt when enabled
5. **Coach UI**: Green dot indicator + UserCheck icon when personalization is active
