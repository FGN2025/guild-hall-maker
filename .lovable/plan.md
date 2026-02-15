
# Add Calendar Date/Time Picker to Create Tournament Dialog

## Overview
Replace the plain text input for "Start Date" with a dual-input approach: a calendar date picker (using the existing Shadcn Calendar + Popover) combined with a separate time input, while keeping the ability to type manually.

## Changes

### File: `src/components/tournaments/CreateTournamentDialog.tsx`

1. **Replace state management** -- split `startDate` string into `startDate: Date | undefined` and `startTime: string` (e.g. "14:00")

2. **Replace the Start Date text input** with:
   - A Popover containing the existing `Calendar` component for date selection
   - A time `<Input type="time">` beside it for picking the hour/minute
   - The calendar button displays the selected date formatted nicely, or placeholder text

3. **Update `handleSubmit`** to combine the selected date + time into an ISO string before calling `onCreate`

### Technical Details

- Uses existing `Calendar`, `Popover`, `PopoverTrigger`, `PopoverContent` components already in the project
- Uses `date-fns` `format` (already installed) for display formatting
- Adds `pointer-events-auto` class to Calendar per Shadcn datepicker best practices
- The time input uses native `<Input type="time">` for simplicity
- No new dependencies required
