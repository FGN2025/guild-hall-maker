

## Remove Grey Bands Around Dashboard Header

The grey bands visible above and below the "Player Dashboard" header are caused by the `main` element's padding (`p-4 md:p-6`) in `AppLayout.tsx`. The dashboard's sticky header uses negative horizontal margins to compensate, but the top padding still creates a visible gap. Below the header, there's also extra `pb-4` spacing.

### Changes

1. **`src/components/AppLayout.tsx`** — On headerless routes, remove the top padding from `main` so page content sits flush against the viewport edge:
   ```tsx
   <main className={`flex-1 overflow-auto ${hideHeader ? 'px-4 md:px-6 pb-4 md:pb-6' : 'p-4 md:p-6'}`}>
   ```

2. **`src/pages/Dashboard.tsx`** — Update the sticky header div to remove the top gap and sit flush:
   - Change `top-0` to `top-[-1rem]` (or just keep `top-0` since we removed top padding)
   - Add top padding inside the sticky header (`pt-4 md:pt-6`) so text doesn't touch the edge
   - Keep `pb-4` as-is for spacing below the header

   Updated class on the sticky div (line 62):
   ```tsx
   <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pt-4 md:pt-6 pb-4">
   ```

This follows the same flush-header pattern already used on `/tournaments`.

