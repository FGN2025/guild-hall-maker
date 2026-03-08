

## Update Calendar Page Header

### Changes

#### `src/components/admin/CalendarPublishManager.tsx`

Replace the current small header (line ~72-75 area with `Calendar` icon + `h3` "Publish Calendar") with a header matching the Web Pages style:

```tsx
<h1 className="font-display text-3xl font-bold text-foreground">Calendars</h1>
<p className="text-muted-foreground font-heading text-sm mt-1">Create custom branded monthly event calendars</p>
```

Keep the "New Calendar" button positioned the same way.

