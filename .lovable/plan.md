# Plan: "Connect your Academy account" instructions for unlinked Skill Passport

## Problem
When a player clicks "Open Skill Passport" on the dashboard and their Play account isn't linked to an FGN Academy profile, the Academy service returns `user_not_linked`. The app currently shows only a terse toast ("Complete an Academy challenge to link it"), which doesn't explain how linking actually works.

The established linking flow (already documented in PlayerGuide and used on the Challenge Detail page) is: register at fgn.academy with the **same email** as the Play account — past completions auto-claim onto the Skill Passport within minutes, and future approvals sync automatically. The unlinked state should surface these instructions.

## Changes

### 1. `src/lib/academyPassport.ts` — connect dialog instead of a bare toast
- When `openPassport()` hits the `user_not_linked` state, show a small dialog (or an action toast) titled **"Connect your Academy account"** with numbered steps:
  1. Go to fgn.academy (opens in a new tab via a button/link).
  2. Sign up using the **same email address** as this Play account.
  3. Your past challenge/quest completions are claimed onto your Skill Passport automatically within a few minutes.
  4. Come back and click "Open Skill Passport" again.
- Include a "Go to FGN Academy" button using the configured passport base URL (falling back to `https://fgn.academy`).
- Implementation: expose the unlinked state from the hook (e.g. `notLinkedOpen` + setter) so consumers can render a shadcn `Dialog`, keeping the hook logic in one place. Update `src/pages/Dashboard.tsx` (the card's "Open Skill Passport" button) to render the dialog. The dialog uses existing design tokens (bg-card, border-accent/40, font-display) to match the dashboard card.

### 2. Copy alignment
- Reuse the same wording pattern as the existing "Join FGN Academy" banner on `ChallengeDetail.tsx` and the PlayerGuide entry, so the instructions are consistent wherever the unlinked state appears.

## Out of scope
- No changes to the `academy-passport-link` edge function (the 200/`user_not_linked` response contract stays as-is).
- No backend, migration, or publish changes. Dispatcher kill switch and all queue state untouched.

## Verification
- Typecheck/build passes.
- Confirm in the preview that clicking "Open Skill Passport" while unlinked shows the instructions dialog with the working fgn.academy link instead of only a toast.
