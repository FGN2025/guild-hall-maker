
# Tournament Calendar View and Event Detail Page

## Overview
Add a full monthly calendar view showing scheduled tournaments, plus a dedicated tournament detail page (similar to the reference screenshot) displaying the game cover, event info, and rules. A new "Calendar" link will be added to the sidebar navigation.

## What You Will Get

1. **Calendar Page** (`/calendar`) -- A month-grid view (like the screenshot) where each day cell shows truncated tournament names. Clicking a tournament navigates to its detail page. Previous/next month navigation arrows are included.

2. **Tournament Detail Page** (`/tournaments/:id`) -- A full page with:
   - Game cover image on the left
   - Tournament name, game category badge, entry fee, date/time, registration cutoff, and a Register/Login button on the right
   - Rules and description rendered below in a styled panel

3. **Sidebar Update** -- A "Calendar" entry added to the main navigation in the sidebar.

## Steps

### Step 1: Create the Calendar Page Component
- New file: `src/pages/TournamentCalendar.tsx`
- Build a custom month-grid calendar (not the small DayPicker widget -- a full-page grid like the reference)
- Fetch tournaments using the existing `useTournaments` hook
- Group tournaments by date and render truncated names inside day cells
- Clicking a tournament name navigates to `/tournaments/:id`
- Month navigation with left/right arrows

### Step 2: Create the Tournament Detail Page
- New file: `src/pages/TournamentDetail.tsx`
- Fetch a single tournament by ID from the database
- Layout: game cover image on the left, event metadata on the right (name, game, category badge, entry fee, date/time, player count, registration status)
- Rules section below with whitespace-preserved text
- Register / Unregister button using the existing `useTournaments` mutations
- Link to bracket view if in progress or completed

### Step 3: Add Routes
- Add `/calendar` route inside the authenticated `AppLayout` group
- Add `/tournaments/:id` route inside the authenticated `AppLayout` group

### Step 4: Update Sidebar Navigation
- Add a Calendar entry (using the `CalendarDays` icon from lucide-react) to the `mainNav` array in `AppSidebar.tsx`

## Technical Details

- No database changes required -- all data already exists in the `tournaments` table (name, game, description, rules, start_date, entry_fee, prize_pool, image_url, status, format, max_participants)
- The `useTournaments` hook already fetches all tournaments with registration counts and game cover URLs
- The calendar grid will be a custom component using `date-fns` for date math (startOfMonth, endOfMonth, eachDayOfInterval, etc.)
- The detail page will query a single tournament by ID via Supabase and also pull registrations and game cover using the same pattern as `useTournaments`
- Existing `TournamentDetailsDialog` logic (register/unregister, bracket link, manage link) will be reused on the detail page

### Files to create
- `src/pages/TournamentCalendar.tsx`
- `src/pages/TournamentDetail.tsx`

### Files to modify
- `src/App.tsx` (add two new routes)
- `src/components/AppSidebar.tsx` (add Calendar nav item)
