# Plan: Skill Passport says "not linked" for accounts that exist on Academy

## Root cause (confirmed by reading both projects)

Darcy's Academy account is real (`darcy@fgn.gg`, Skill Passport visible on fgn.academy), yet Play's passport link returns `user_not_linked`. Reading the Academy project ("Skill Command Center") shows why:

- Academy's `credential-api` `POST /passport-link` resolves the caller **only** by `play_identity.external_user_id`. If no row matches, it returns 404 `user_not_linked`. It never looks at email.
- `play_identity` rows are created **only** by `play-webhook-receiver`, which supports just three events: `challenge.completed`, `evidence.approved`, `achievement.earned`. That receiver *does* have an email fallback (`get_user_id_by_email`) and upserts `play_identity` when it matches.
- Play's `academy-passport-link` sends only `external_user_id` (the Play user UUID) — unlike every sync function, which sends `user_email` too.

So: an Academy member who has never had a completion sync from Play has no `play_identity` row, and the passport link can never resolve them. It is an identity-mapping gap, not a missing user.

## Changes

### 1. Play side — send the email (this project)
In `supabase/functions/academy-passport-link/index.ts`, add `user_email: user.email` to the signed canonical payload alongside `external_user_id`. The HMAC is computed over the final body, so signing stays valid, and Academy already ignores unknown fields. Redeploy that one function.

### 2. Academy side — resolve by email and self-heal (project "Skill Command Center", separate approval)
In `supabase/functions/credential-api/index.ts`, the `passport-link` branch should mirror `play-webhook-receiver.resolveIdentity`: when no `play_identity` row matches `external_user_id`, look the user up by `user_email` via `get_user_id_by_email`, and on a hit upsert the `play_identity` mapping (on conflict `external_user_id`) before issuing the token. Only return `user_not_linked` when both lookups fail.

This is the change that actually fixes Darcy's case. Step 1 alone does nothing without it; step 2 alone works for nobody until Play sends the email. Both are needed, and step 2 must be made in the other project.

### 3. Play side — real instructions for the genuinely unlinked
Once identity resolution is correct, a 404 means the person truly has no Academy account. Replace the terse toast in `src/lib/academyPassport.ts` with a "Connect your Academy account" dialog rendered from `src/pages/Dashboard.tsx`:

1. Open fgn.academy (button, new tab, using configured `passport_base_url`).
2. Sign up with the **same email you use here** — that address is the link key.
3. Past completions are claimed onto your Skill Passport within a few minutes.
4. Return and click "Open Skill Passport".

Styled with existing tokens (bg-card, accent border, font-display) to match the dashboard card; wording matches the existing "Join FGN Academy" banner on `ChallengeDetail.tsx`.

## Verification
- After step 1 + 2 are live, click "Open Skill Passport" as `darcy@fgn.gg`; expect a magic link and a new `play_identity` row on Academy instead of the red error toast.
- Check the Play edge-function logs for the passport-link response and Academy's `play_sync_attempts` mirror row.

## Out of scope / safety
- No migrations, no row edits, no publishing. Dispatcher kill switch and marketing queue untouched.
- The only backend change in this project is the added `user_email` field in one edge function.
