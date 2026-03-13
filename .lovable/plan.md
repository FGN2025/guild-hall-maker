

## Plan: Replace "Prize" Text with Trophy Icon on Tournament Cards

### Problem
The tournament grid cards show the word "Prize" as a label under the prize value. It should use a Trophy icon instead, matching the pattern used by the Date (Calendar icon) and Players (Users icon) boxes.

### Changes

Three files need the same one-line fix — replace `<p className="text-[10px] text-muted-foreground">Prize</p>` with a Trophy icon:

1. **`src/pages/admin/AdminTournaments.tsx`** (line 293)
2. **`src/pages/moderator/ModeratorTournaments.tsx`** (line 290)

Both already import `Trophy`. Replace the `<p>Prize</p>` text with `<Trophy className="h-3.5 w-3.5 text-primary mx-auto mt-0.5" />` to match the Calendar and Users icon styling in the sibling stat boxes.

