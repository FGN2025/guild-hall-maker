

# Floating AI Coach Button

## Overview
Replace the dedicated `/coach` page with a floating chat widget accessible from any authenticated page. A persistent floating button (bottom-right corner) opens a slide-up chat panel, so users can ask coaching questions without leaving their current page.

## Changes

### 1. Create `src/components/CoachFloatingButton.tsx`
A new component containing:
- A circular floating button (bottom-right, `fixed` position) with the `BrainCircuit` icon
- When clicked, opens a chat panel (either a slide-up card or a Sheet/Drawer)
- The chat panel contains the full Coach UI: game selector, message list with markdown rendering, input box, suggested questions
- Panel can be dismissed/minimized back to the floating button
- Uses the existing `useCoachChat` hook for all chat logic
- Includes a subtle pulse/glow animation on the button to draw attention

### 2. Add the floating button to `AppLayout.tsx`
- Import and render `CoachFloatingButton` inside the layout so it appears on every authenticated page
- Positioned with `z-50` to float above all content

### 3. Remove `/coach` as a standalone route
- Remove the `/coach` route from `App.tsx`
- Remove the "AI Coach" link from `AppSidebar.tsx`
- Keep `src/pages/Coach.tsx` content but refactor the chat UI into the floating panel component (or reuse inline)

### 4. Floating panel design
- Panel dimensions: approximately 400px wide x 500px tall on desktop, full-width on mobile
- Glass-panel styling with backdrop blur to match the cyberpunk aesthetic
- Smooth open/close animation (scale + fade or slide-up)
- Close button in the panel header
- Chat messages use `ScrollArea` with auto-scroll to bottom
- Game selector dropdown in the panel header

## Technical Details

### Files to create
- `src/components/CoachFloatingButton.tsx` -- floating button + expandable chat panel

### Files to modify
- `src/components/AppLayout.tsx` -- render `CoachFloatingButton`
- `src/components/AppSidebar.tsx` -- remove AI Coach nav item
- `src/App.tsx` -- remove `/coach` route

### Existing code reused
- `useCoachChat` hook (no changes needed)
- `useGames` hook for game selector
- `react-markdown` for response rendering
- All edge function logic remains unchanged
