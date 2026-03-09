

## Add Hero Image Lightbox on Challenge Detail

When a user clicks the hero/cover image on the challenge detail page, show the full image in a dialog overlay.

### Changes

**`src/pages/ChallengeDetail.tsx`**:
1. Add `useState` for controlling a lightbox dialog open state.
2. Wrap the hero `<img>` with an `onClick` handler and `cursor-pointer` class to open the lightbox.
3. Render a `Dialog` containing the full-resolution image with `object-contain` styling so the entire image is visible without cropping.

The dialog will use the existing `Dialog` component from `src/components/ui/dialog.tsx` with a wider `max-w-4xl` content area and no padding, so the image fills the popup cleanly.

