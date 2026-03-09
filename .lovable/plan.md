

## Add "Click image for full view" indicator on Challenge Detail hero

### Change

**`src/pages/ChallengeDetail.tsx`** — Add a small text hint in the top-right corner of the hero image that says "Click image for full view" with a subtle icon. It will appear with reduced opacity and brighten on hover, keeping the design clean.

Specifically, inside the hero `<div>` (line 90), add an absolutely-positioned element in the top-right corner:
```tsx
<span className="absolute top-3 right-3 text-xs text-white/60 bg-black/40 px-2 py-1 rounded-md flex items-center gap-1 group-hover:text-white/90 transition-colors">
  <ImageIcon className="h-3 w-3" /> Click for full view
</span>
```

Also add `group` to the parent div's className so the hover effect works.

