

## Fix Admin Action Bar Visibility on Challenge Detail Page

### Problem
The "Edit Challenge", "Copy to Quest", and "Delete" buttons on the Challenge Detail page are barely legible against the dark background — same visibility issue fixed previously on filter sections and the calendar image.

### Fix — `src/pages/ChallengeDetail.tsx` (lines 162–174)

Wrap the admin action bar in a frosted-glass container matching the established pattern:

```tsx
{(isAdmin || isModerator) && (
  <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
    <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/40 hover:bg-white/10">
      <Pencil className="h-4 w-4" /> Edit Challenge
    </Button>
    <Button variant="outline" size="sm" className="gap-1.5 text-white border-white/40 hover:bg-white/10" onClick={() => copyToQuest(id!)} disabled={copying}>
      <Copy className="h-4 w-4" /> {copying ? "Copying..." : "Copy to Quest"}
    </Button>
    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteConfirmOpen(true)}>
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
  </div>
)}
```

Changes:
- Outer container gets `bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl` for the frosted-glass look
- Outline buttons get `text-white border-white/40 hover:bg-white/10` for bright legible text and borders
- Destructive button stays as-is (already high contrast red)

### Files changed

| File | Change |
|------|--------|
| `src/pages/ChallengeDetail.tsx` | Wrap admin action bar in frosted-glass container, brighten button text/borders |

