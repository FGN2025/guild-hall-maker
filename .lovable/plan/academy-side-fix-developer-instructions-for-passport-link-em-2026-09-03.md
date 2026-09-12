# Academy-side fix: developer instructions for /passport-link email fallback

Play-side work (step 2's counterpart) is already done and deployed: `academy-passport-link` now sends `user_email` in the signed payload, and unlinked users get a "Connect your Academy account" dialog. This document is the handoff for the FGN Academy ("Skill Command Center") developer to close the remaining gap.

## Problem

`POST /passport-link` in `supabase/functions/credential-api/index.ts` resolves identity **only** by `play_identity.external_user_id` (lines 220–230). If no `play_identity` row exists for the Play UUID, it returns 404 `user_not_linked` — even when the same email already has an Academy account. Meanwhile `play-webhook-receiver` already has a working email fallback (`resolveIdentity`, lines 148–187) that passport-link does not use.

Play now includes `user_email` in the signed request body, so Academy can use it.

## Requested change (credential-api/index.ts, /passport-link route)

After the existing `play_identity` lookup, if `identity` is null:

1. Read `parsed?.user_email` (optional string; validate/normalize to lowercase, trim).
2. If present, call the existing RPC the webhook receiver uses:
   `supabase.rpc('get_user_id_by_email', { p_email: email })`.
3. If it returns a user id:
   - Upsert into `play_identity` `{ user_id, external_user_id, email, last_seen_at: now() }` with `onConflict: 'external_user_id'` — identical to `resolveIdentity` lines 170–181. This permanently links the accounts so future lookups hit the fast path.
   - Continue to token creation using that `user_id`.
4. If email is absent or the RPC finds no user, return the existing 404 `user_not_linked` unchanged.

Reference implementation to mirror: `supabase/functions/play-webhook-receiver/index.ts`, function `resolveIdentity` (lines 148–187). Best option: extract that helper into `_shared/` and call it from both functions so the two paths never drift.

## Notes for the developer

- Keep the HMAC/ecosystem-key verification exactly as-is (lines 90–202). Play signs the raw body including `user_email`, so no signature changes are needed on either side.
- `user_email` must stay optional — older Play deploys and other ecosystem callers won't send it; behavior for them must be unchanged.
- The mirror insert (`play_sync_attempts`) already captures `raw_body`, so email-fallback resolutions will be auditable without new logging; optionally add `matched_by: 'play_identity' | 'email'` to the response snapshot.
- Do not create an Academy account from passport-link when the email matches nothing — 404 `user_not_linked` is the correct response; Play's client shows connection instructions for that case.

## Acceptance test

1. Pick a Play user whose email has an Academy account but no `play_identity` row (e.g. darcy@fgn.gg).
2. From Play, invoke `academy-passport-link` (or POST the signed body directly).
3. Expect 200 with `{ url, expires_at, user_resolved: true }`, a new `passport_link_tokens` row, and a new `play_identity` row keyed on the Play UUID.
4. Repeat the call — expect the fast path (play_identity hit, no email RPC needed).
5. A Play UUID with no matching Academy email must still get 404 `user_not_linked`.

## What this project will do after Academy deploys

- Re-test Darcy's Skill Passport button end-to-end from the Play dashboard.
- No further Play-side changes are required; the payload already carries `user_email`.
