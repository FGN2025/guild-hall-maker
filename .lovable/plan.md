

## Increase All Background Opacities to 50% and Expand Admin Slider to 100%

### 1. Update all existing background opacities in the database
Run an UPDATE query to set all `page_backgrounds` rows to `opacity = 0.50`.

### 2. Expand the admin opacity slider range (`src/components/admin/PageAppearanceManager.tsx`)
- **Line 207**: Change `Slider` `max` from `0.5` to `1.0`
- **Line 301**: Change the clear-handler default opacity from `0.25` to `0.50`
- **Line 356**: Change the `getBgDraft` fallback opacity from `0.25` to `0.50`

### 3. Update default opacity in the upsert hook (`src/hooks/usePageBackground.ts`)
- **Line 56**: Change the default `opacity` value from `0.25` to `0.50`

### Result
- All existing backgrounds immediately display at 50% opacity
- New backgrounds default to 50%
- Admins can set opacity from 5% up to 100% via the slider

