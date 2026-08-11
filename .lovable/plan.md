# Fix: the shadow still moves with the background

## What is actually happening

The editor code is already correct: it paints the scrim (bottom gradient, copy panel, accent bar) as a canvas-fixed layer that ignores background pan/zoom. But that layer only exists when the stored image was rendered *without* a baked-in scrim and the scrim spec was saved alongside it.

Checked the data: all 17 existing marketing assets (created 2026-08-10) have **no** `scrim` entry in `overlay_config`. Their gradient is burned into the PNG pixels, so panning the artwork drags the shadow with it — exactly what the Forza screenshot shows. New composes from the updated composer do save it; these older ones predate that.

## The fix

1. **Re-render the existing assets scrim-free.** For every asset that has promo metadata but no `scrim` key, re-run the composer with `includeScrim: false`, overwrite the stored PNG in place (same `file_path`, so nothing that references it breaks), and write `scrim` + `scrimImageBg` into `overlay_config`. Text layers and the rest of `overlay_config` stay as they are.
2. **Stop the silent fallback.** If an asset still has no `scrim` spec, the editor currently allows background pan/zoom anyway, which visibly drags the baked shadow. Instead, when no scrim spec is present and the asset has promo metadata, derive one from the layout engine on open (same path used on format switch) so the fixed layer is always available.
3. **Guard the remaining legacy case.** For assets with no promo metadata at all (hand-uploaded images with no known scrim), leave pan/zoom fully enabled — there is no baked scrim to fight.

## Verification

- Re-open the Forza day-of asset, pan and zoom: the gradient, copy panel and accent bar stay locked to the canvas while only the car photo moves.
- Confirm all 17 assets end with `overlay_config ? 'scrim'` true and the same `file_path` count in storage (no orphans created).
- Confirm the 17 `pending_review` posts and their `asset_id` links are unchanged.

## Technical notes

- Re-render runs through the existing `promo-render` worker path, reusing `derivePromoArgs` / `composePromoLayout` for assets whose `overlay_config.promo` is present.
- Uploads use upsert on the existing path — no `storage.objects` deletes (those roll back whole migrations).
- Scrim spec written in the same shape `scrimFromScene` produces, so `drawScrim` in the editor consumes it unchanged.
