

## Enhanced Color Picker for Brand Colors

### Overview
Replace the basic native `<input type="color">` elements with a rich, custom color picker component that includes a visual palette, preset swatches, and hex/RGB input -- all built with existing project dependencies (Radix Popover).

### Changes

#### 1. Create `ColorPicker` Component (`src/components/ui/color-picker.tsx`)
- A reusable component that opens a Popover when clicked
- Contains:
  - **Saturation/brightness gradient panel** -- a 2D canvas-based picker area for selecting shade and brightness
  - **Hue slider** -- a horizontal rainbow strip to select the base hue
  - **Preset swatches** -- a row of commonly used brand colors (8-10 presets) for quick selection
  - **Hex input** -- editable text field showing the current hex value
- Uses Radix Popover (already installed) for the dropdown
- Trigger is a styled color swatch button showing the current color
- Fully controlled via `value` and `onChange` props

#### 2. Update Tenant Settings Page (`src/pages/tenant/TenantSettings.tsx`)
- Replace the native `<input type="color">` + `<Input>` combos for both Primary and Accent colors with the new `<ColorPicker>` component
- Keep the existing save flow unchanged

#### 3. Update Admin Tenants Page (`src/pages/admin/AdminTenants.tsx`)
- Replace any native color inputs in the New Provider dialog with the new `<ColorPicker>` component for consistency

### Technical Details

**Files to create:**
- `src/components/ui/color-picker.tsx` -- Reusable color picker with gradient panel, hue slider, swatches, and hex input

**Files to modify:**
- `src/pages/tenant/TenantSettings.tsx` -- Swap native inputs for `<ColorPicker>`
- `src/pages/admin/AdminTenants.tsx` -- Swap native inputs for `<ColorPicker>`

**No new dependencies required.** The component uses HTML Canvas for the gradient, Radix Popover for the dropdown, and pure color math (HSV to/from hex) implemented inline.

