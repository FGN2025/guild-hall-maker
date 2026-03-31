

## Fix: Public Challenges Page Not Using Display Order

### Problem
The public `/challenges` page queries challenges sorted by `created_at desc` (line 28 of `Challenges.tsx`), ignoring the `display_order` column you set up via drag-and-drop in the admin panel.

### Fix — `src/pages/Challenges.tsx`

Change the `.order()` call from:
```ts
.order("created_at", { ascending: false })
```
to:
```ts
.order("display_order", { ascending: true })
```

This single-line change makes the public page respect the same ordering you configured in the admin panel.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/Challenges.tsx` | Change sort from `created_at desc` → `display_order asc` |

