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

# Edit from the review queue

## The change

Next to each asset preview in the Marketing > Review queue, add an **Edit image** button beside the existing "Review asset" button. Clicking it opens the same image editor used elsewhere in the marketing library, loaded with that draft's image, so a reviewer can fix a typo or tweak the design instead of rejecting and sending it back.

Behavior:
- Available on asset rows, on linked campaign assets, and on scheduled-post images.
- Saving from the editor creates a new asset revision linked to the same campaign, still unpublished/pending review — it does not auto-approve.
- Only reviewers who can approve (tenant Admin/Manager) see the Edit button; Marketing-only staff keep view-only access.
- The review queue refreshes after a save so the updated image shows.

## Technical notes

- Files: `src/components/tenant/AgentDraftsPanel.tsx` (button + dialog state), reusing `src/components/media/AssetEditorDialog.tsx` with `baseImageUrl` set to the asset's `source_url ?? url`.
- On save, call `useTenantMarketingAssets().uploadAsset` with the original `campaignId`, `sourceAssetId`, and the returned `overlayConfig`/`backgroundUrl`, then invalidate the review-queue queries.

## Not included

The existing "Acem ATS Challenge" record is left as-is per this plan. Say the word if you also want it corrected and the promo regenerated.

