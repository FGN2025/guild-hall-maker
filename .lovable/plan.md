

# AI-Enhanced Challenge Description

## What to Build

Add a "✨ Enhance with AI" button next to the Description textarea in the Create Challenge dialog. When clicked, it sends the challenge name and current description to an edge function that uses Lovable AI to generate a polished, engaging description. The moderator can accept, regenerate, or edit the result.

## Implementation

### 1. Edge Function: `supabase/functions/enhance-challenge-description/index.ts`

- Accepts `{ name, description, challenge_type }` 
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a prompt like: "You are a gaming community manager. Rewrite this challenge description to be engaging, clear, and motivating for competitive gamers. Keep it concise (2-3 sentences max). Challenge name: {name}. Type: {type}. Draft description: {description}"
- Returns `{ enhanced_description }` (non-streaming, simple invoke)
- Handles 429/402 errors

### 2. Update `src/pages/moderator/ModeratorChallenges.tsx`

- Add an "Enhance with AI" button (with Sparkles icon) below the Description textarea
- Button is enabled when `form.name` is non-empty (description can be empty -- AI will generate from scratch using the name)
- On click: call `supabase.functions.invoke('enhance-challenge-description', { body: { name, description, challenge_type } })`
- While loading: show spinner on button, disable textarea
- On success: populate description field with the enhanced text
- On error: show toast with error message
- User can freely edit the result or click enhance again

### Files Changed

| File | Action |
|---|---|
| `supabase/functions/enhance-challenge-description/index.ts` | Create -- edge function for AI enhancement |
| `src/pages/moderator/ModeratorChallenges.tsx` | Update -- add enhance button + state |

