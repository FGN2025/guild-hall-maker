

## Answers & Plan

### When Do Story Intros and Outros Appear?

Currently in `QuestDetail.tsx`:
- **Story Intro** (line 167): Shown to **all visitors** immediately below the hero image, as long as `story_intro` has content — no enrollment required.
- **Story Outro** (line 264): Shown **only after the player completes the quest** (`enrollment.status === "completed"`). It acts as a reward/epilogue unlocked upon completion.

This is the intended design — the intro hooks the player before they enroll, and the outro is a narrative payoff for finishing.

### Plan: Improve Enhance Button Prompt Quality

The current `enhance-quest-narrative` edge function prompt is decent but generic. It should be upgraded to produce richer, more storyteller-quality output that researches the game world.

**File: `supabase/functions/enhance-quest-narrative/index.ts`**

Update the system prompt and field instructions to:
- Adopt a **master storyteller persona** — write as if narrating an epic tale, not a community announcement
- Instruct the model to **research and reference the game's world, lore, characters, and locations** using its training knowledge plus any RAG context
- Produce **3-5 sentences** (slightly longer than current 2-4) that are exciting and intriguing
- For **intros**: create mystery, stakes, and a call to adventure that makes players feel like protagonists
- For **outros**: deliver a satisfying climax celebrating the achievement with lore-appropriate grandeur
- Include the quest's **tasks** in the prompt so the narrative can reference specific objectives

Also pass `tasks` (array of task titles) from the calling code in `EditQuestDialog` and `CreateQuestDialog` if available, to give the AI more material.

**Files to update:**
1. `supabase/functions/enhance-quest-narrative/index.ts` — richer prompts, accept `tasks` array
2. `src/components/quests/EditQuestDialog.tsx` — pass task titles to the enhance call
3. `src/components/quests/CreateQuestDialog.tsx` — pass task titles to the enhance call (if tasks exist at creation time)

