

## Add Edit & Image Upload to Prize Catalog

### Overview
Add the ability for moderators to edit existing prize details (name, description, cost, quantity) and upload prize images, all within the Prize Catalog tab on the Moderator Redemptions page.

### Changes

**1. Update `src/pages/moderator/ModeratorRedemptions.tsx`**

- Add an **Edit button** (pencil icon) on each prize card that opens an edit dialog
- Add state for `editPrize` (the prize being edited) and `editForm` (form fields)
- Add an `updatePrizeMutation` that calls `supabase.from("prizes").update(...)` with the edited fields
- Add an **image upload input** to both the Create and Edit dialogs:
  - File input accepts `image/jpeg, image/png, image/webp`
  - On file select, validate using the existing `validateAndToast` utility with the `cardCover` preset
  - Upload the file to the `app-media` storage bucket under `prizes/{prizeId or timestamp}-{filename}`
  - Get the public URL and save it as `image_url` on the prize record
- Show a **thumbnail preview** of the current image (if any) in the edit dialog and on each prize card
- Add `imageFile` state to track the pending upload for both create and edit flows
- Import `Pencil`, `ImagePlus` icons from lucide-react

**2. No database or storage changes needed**
- The `prizes` table already has an `image_url` column
- The `app-media` storage bucket already exists and is public
- RLS on prizes already allows moderator/admin full access

### Technical Details

- **Image upload flow**: On form submit, if an `imageFile` is set, upload to `app-media` bucket first, get public URL, then include `image_url` in the insert/update call
- **Validation**: Reuse `validateAndToast(file, IMAGE_PRESETS.cardCover)` from `src/lib/imageValidation.ts`
- **Edit dialog**: Pre-populate form fields from the selected prize; reuse the same form layout as the create dialog with an added image section
- **Prize cards**: Show the image thumbnail at the top of each card if `image_url` exists, matching the layout already used in `PrizeShop.tsx`

