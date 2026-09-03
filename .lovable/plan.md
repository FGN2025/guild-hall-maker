# Plan: Fix Skill Passport "not linked" for accounts that do exist on Academy

## What the reads show

- The Academy integration runs in `magic_link` mode against `.../credential-api/passport-link` (confirmed in `tenant_integrations.additional_config`).
- `darcy@fgn.gg` exists in Play as user `84d2999e-0eae-4a52-b508-a0aafc6c84d7`, and Darcy says the same address is an active FGN.Academy account.
- Every **sync** function (`sync-to-academy`, quest/achievement/task variants) sends **both** `user_email` and `external_user_id` to Academy, so Academy can resolve a member by email.
- `academy-passport-link` sends **only** `external_user_id` (the Play UUID). It never sends the email.

Most likely cause (not yet proven end to end): Academy has the member on file by email, but has no record of that Play UUID as an external id, so the passport-link endpoint answers 404 `user_not_linked`. This is unconfirmed until we test a request that includes the email, so that test is step 1.

## Step 1 — Confirm the cause

Call `academy-passport-link` for Darcy's account and read the edge-function logs (signature prefix, response body). Then call Academy's passport-link endpoint again with `user_email` added to the signed payload and compare: if the email-bearing request resolves and the UUID-only one 404s, the identity mismatch is confirmed.

## Step 2 — Send the email (identity parity with the sync path)

In `supabase/functions/academy-passport-link/index.ts`, include `user_email: user.email` in the signed canonical payload alongside `external_user_id`, matching what the sync functions already send. The HMAC is computed over the final JSON body, so signing stays correct. If Academy resolves by email, existing accounts stop reporting as unlinked without any user action.

## Step 3 — Real "not linked" state gets real instructions

Only for accounts genuinely absent on Academy (still 404 after step 2), replace the terse toast in `src/lib/academyPassport.ts` with a dialog titled **"Connect your Academy account"**:

1. Open fgn.academy (button, new tab, using the configured `passport_base_url`).
2. Sign up with the **same email you use here** — that address is the link key.
3. Past completions are claimed onto the Skill Passport within a few minutes.
4. Return and click "Open Skill Passport" again.

Rendered from `src/pages/Dashboard.tsx` with existing tokens (bg-card, accent border, font-display) so it matches the card. Wording matches the existing "Join FGN Academy" banner on `ChallengeDetail.tsx`.

## Out of scope / safety

- No migrations, no row edits, no publishing. The dispatcher kill switch and all marketing queue state stay untouched.
- The only backend change is the added `user_email` field in the passport-link payload plus a redeploy of that one function.
