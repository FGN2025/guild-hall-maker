

## Phase: Move Calendar Publish Manager to Its Own Tab

### Problem
The "Publish Calendar" section currently sits above the campaign cards inside the Campaigns tab, breaking visual consistency. Making it a dedicated tab aligns with the existing tab pattern (Campaigns, Web Pages).

### Changes

#### `src/pages/admin/AdminMarketing.tsx`

1. Add a third tab trigger "Calendars" (with a calendar icon) to the `TabsList`, between Campaigns and Web Pages.

2. Create a new `TabsContent value="calendars"` that renders `<CalendarPublishManager />`.

3. Remove the `<CalendarPublishManager />` call from inside the Campaigns `TabsContent`.

Result: three clean tabs — **Campaigns** | **Calendars** | **Web Pages**.

No other files or backend changes needed.

