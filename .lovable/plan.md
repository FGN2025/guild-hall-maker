

## Move Achievement Badge Into Description Area

The achievement badge currently renders as a separate block below the stats grid (line 95-98), causing cards with badges to be taller than those without. Move it inline into the description area so all cards remain equal height.

### Change: `src/components/tournaments/TournamentCard.tsx`

1. **Remove** the standalone `AchievementBadgeDisplay` block (lines 95-98)
2. **Embed** the badge inside the description container (line 67-69), appending it after the description text

The description container already has `h-[2.5rem] overflow-y-auto` which will accommodate the badge within the scrollable area, keeping card heights uniform.

```tsx
// Before (line 67-69):
<div className="text-xs text-muted-foreground mb-4 h-[2.5rem] overflow-y-auto whitespace-pre-line">
  {t.description || "\u00A0"}
</div>

// After — increase height slightly to fit badge, render badge below text:
<div className="text-xs text-muted-foreground mb-4 h-[3.5rem] overflow-y-auto whitespace-pre-line">
  {t.description || "\u00A0"}
  {(t as any).achievement_id && (
    <div className="mt-1">
      <AchievementBadgeDisplay achievementId={(t as any).achievement_id} compact />
    </div>
  )}
</div>
```

This keeps all cards the same outer dimensions regardless of whether they have an achievement attached.

