

## Academy Skills Development Notification System

### Concept

When a player completes a challenge on play.fgn.gg, the existing `sync-to-academy` edge function already sends completion data. The academy API response can include a `next_step` payload describing the recommended learning path. We capture that response and use it to generate a targeted notification and persistent banner, directing the player to their next skills development opportunity on fgn.academy.

This avoids building a chain/track system on play.fgn.gg — challenges remain standalone, and fgn.academy owns the structured learning journey.

### How It Works

```text
Player completes challenge
        │
        ▼
sync-to-academy fires ──► Academy API
        │                      │
        │              returns next_step:
        │              { title, url, description }
        │                      │
        ▼                      ▼
Store next_step in         ┌──────────────────┐
challenge_completions      │ In-app notification│
(academy_next_step col)    │ + ChallengeDetail  │
                           │   banner with link  │
                           └──────────────────┘
```

### Changes

**1. Database migration** — Add `academy_next_step` column to `challenge_completions`
```sql
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS
  academy_next_step_url text DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS
  academy_next_step_label text DEFAULT NULL;

ALTER TABLE public.challenge_completions ADD COLUMN IF NOT EXISTS
  academy_next_step jsonb DEFAULT NULL;
```
- `challenges.academy_next_step_url` + `academy_next_step_label`: Admin-configurable fallback per challenge (e.g., "OSHA Safety Course" → `https://fgn.academy/courses/osha-safety`)
- `challenge_completions.academy_next_step`: Stores the academy API response per player (personalized next step)

**2. `sync-to-academy` edge function** — Capture academy response
- Parse the academy API response for a `next_step` object (title, url, description)
- If present, store it in `challenge_completions.academy_next_step`
- If the academy doesn't return a next step, fall back to the challenge's configured `academy_next_step_url` / `academy_next_step_label`
- Send an in-app notification: "Continue your skills journey — [next step title] is available on FGN Academy"

**3. `ChallengeDetail.tsx`** — Enhanced completion banner
- When a completed challenge has `academy_next_step` data (from completion record or challenge fallback), show a styled "Continue Your Training" card with:
  - The next step title and description
  - A direct link to fgn.academy course/module
  - Replaces the current generic "sign up at FGN Academy" message for synced users

**4. Admin challenge form** — Add optional "Academy Next Step" fields
- In the challenge edit dialogs (`EditChallengeDialog.tsx` and `CreateChallengeDialog.tsx`), add two optional fields:
  - "Academy Next Step Label" (text, e.g., "OSHA Safety Fundamentals")
  - "Academy Next Step URL" (url, e.g., `https://fgn.academy/courses/osha-safety`)
- These serve as the default recommendation when the academy API doesn't return a personalized next step

**5. CDL Generate** — Auto-populate academy next step
- When generating CDL challenges, the AI prompt can suggest a recommended academy course based on the CDL domain, auto-filling the next step fields

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `academy_next_step_url`, `academy_next_step_label` to `challenges`; add `academy_next_step` jsonb to `challenge_completions` |
| `supabase/functions/sync-to-academy/index.ts` | Parse academy response for `next_step`, store in completion record, send notification |
| `src/pages/ChallengeDetail.tsx` | Show "Continue Your Training" card with personalized or fallback next step link |
| `src/components/challenges/EditChallengeDialog.tsx` | Add optional Academy Next Step fields |
| `src/components/challenges/CreateChallengeDialog.tsx` | Add optional Academy Next Step fields |
| `src/pages/moderator/ModeratorCDLGenerate.tsx` | Auto-populate next step from CDL domain config |

### Important Notes

- **No chain system needed on play.fgn.gg** — fgn.academy owns the structured journey. Play.fgn.gg simply points players there after completion.
- **Graceful fallback** — If academy API doesn't return next steps yet, the admin-configured fallback fields ensure players still get directed to relevant content.
- **Existing sync unaffected** — This extends the current sync flow without changing the existing contract; it only reads additional data from the response.

