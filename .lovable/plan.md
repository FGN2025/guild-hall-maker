

# Make AI Coach Game Selector More Prominent

## What Changes
Replace the small gamepad icon button in the AI Coach header with a visible, labeled dropdown button that shows the current selection (e.g., "All Games" or the selected game name) with a chevron indicator.

## Details

### File: `src/components/CoachFloatingButton.tsx`

**Current** (lines ~120-137): A ghost icon button with `Gamepad2` icon triggers the dropdown -- easy to miss.

**New**: Replace with a styled button showing:
- The `Gamepad2` icon (small, left side)
- Text label: either "All Games" or the selected game name (truncated if long)
- A `ChevronDown` icon on the right
- Use `variant="outline"` and a compact size so it fits the header without overwhelming it

The dropdown menu content stays the same -- just the trigger changes from an unlabeled icon to a labeled button.

## Technical Changes

In `CoachFloatingButton.tsx`, replace the `DropdownMenuTrigger` button (around lines 121-125):

```tsx
// Before
<Button variant="ghost" size="icon" className="h-8 w-8">
  <Gamepad2 className="h-4 w-4" />
</Button>

// After
<Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 max-w-[160px]">
  <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
  <span className="truncate text-xs">
    {selectedGame ? selectedGame.name : "All Games"}
  </span>
  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
</Button>
```

No other files need changes.

