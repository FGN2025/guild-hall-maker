# Auto-fill the challenge promo headline

## What's happening

The "ACEM ATS CHALLENGE" text on the promo is not a rendering bug — the headline is a free-text field on the tenant challenge schedule, and it was saved as "Acem ATS Challenge" (the promo renderer just uppercases it). Since staff hand-type this every time, typos like this will keep happening.

## The change

When a tenant staff member opens the schedule dialog for a challenge, prefill the Headline field with a sensible default built from the tenant name and the selected challenge, e.g. `Acme Broadband — ATS - Gold Challenge - Uncommon Rarity`.

Behavior:
- Prefill only when creating a new schedule and the headline is still empty.
- If the user picks a different challenge in the dialog and hasn't typed their own headline yet, update the prefill to match.
- Once the user edits the headline, stop overwriting it.
- Editing an existing schedule keeps whatever headline was already saved.
- The field stays fully editable; nothing is forced.

## Technical notes

- File: `src/pages/tenant/TenantChallenges.tsx`.
- Compose the default from `tenantInfo.tenantName` (from `useTenantAdmin`) plus `selectedChallenge.name`.
- Track a `headlineTouched` flag in component state so the auto-fill stops after manual edits; reset it in `openCreate`/`openEdit`.
- No database or hook changes; `handleSave` and Quick Promo composition stay as-is.

## Not included

The existing "Acem ATS Challenge" record is left as-is per this plan. Say the word if you also want it corrected and the promo regenerated.
