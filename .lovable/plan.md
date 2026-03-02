
# Add Password Visibility Toggle

Add an eye/eye-off toggle button to all password input fields across the app, allowing users to show or hide their password.

## Approach

Create a reusable `PasswordInput` component that wraps the existing `Input` component with a visibility toggle button (eye icon). Then replace all password `Input` usages with this new component.

## Changes

### 1. Create `src/components/ui/password-input.tsx`
A new reusable component that:
- Wraps the standard `Input` with `type` toggling between `"password"` and `"text"`
- Renders an `Eye` / `EyeOff` icon button on the right side of the input
- Forwards all standard input props (className, placeholder, ref, etc.)
- Uses `lucide-react` icons (`Eye`, `EyeOff`)

### 2. Update `src/pages/Auth.tsx`
- Import `PasswordInput` and replace the password `<Input>` with `<PasswordInput>`

### 3. Update `src/pages/ResetPassword.tsx`
- Replace both password fields (new password + confirm password) with `<PasswordInput>`

### 4. Update `src/components/tenant/NISCConfigDialog.tsx` and `BillingConfigDialog.tsx`
- Replace API key password fields with `<PasswordInput>` for consistency

## Technical Details

The `PasswordInput` component will:
- Manage internal `showPassword` state
- Toggle `type` between `"password"` and `"text"`
- Render the toggle button with `absolute right-3` positioning
- Accept all props that `Input` accepts via `React.ComponentProps<typeof Input>`
- Add `pr-10` padding to avoid text overlapping the icon
