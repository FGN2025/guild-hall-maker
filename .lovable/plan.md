

## Lower Card Cover Minimum Dimensions

The `cardCover` preset in `src/lib/imageValidation.ts` currently enforces `minWidth: 640` and `minHeight: 360`, which rejects images like the 533px-wide Gears 5 cover shown in the screenshot.

### Change

In `src/lib/imageValidation.ts`, update the `cardCover` preset:
- `minWidth`: 640 → **320**
- `minHeight`: 360 → **180**

This keeps a reasonable floor (320×180 is standard small thumbnail size) while accepting the images you're working with. Also update `tournamentHero` which shares the same minimums:
- `minWidth`: 640 → **320**
- `minHeight`: 360 → **180**

### File
- `src/lib/imageValidation.ts` — lines 16-17 and 39-40

