

## Plan: Unify Lucide Icons for Achievements + Add Moderator Achievement Management

### Problem
1. **Icons render as plain text** — `AchievementBadgeDisplay` and `AchievementPicker` display the icon field as text (e.g. "swords") instead of rendering the actual Lucide icon. Only `PlayerAchievements.tsx` correctly maps icon strings to Lucide components.
2. **No moderator access** — Only admins can manage achievements. Moderators have no achievements page or sidebar link.
3. **Admin icon selector has no visual preview** — The icon dropdown in `AdminAchievements.tsx` shows plain text labels with no icon preview.

### Changes

**1. Create shared icon utility** (`src/lib/achievementIcons.tsx`)
- Export a single `ACHIEVEMENT_ICON_MAP` mapping string keys to Lucide components: `trophy`, `flame`, `star`, `crown`, `target`, `shield`, `swords`, `zap`, `medal`, `award`, `sparkles`, `heart`, `gem`, `bolt`, `rocket`
- Export a helper `getAchievementIcon(name: string)` that returns the component (defaulting to `Trophy`)
- Single source of truth used everywhere

**2. Update `AchievementBadgeDisplay.tsx`**
- Import `getAchievementIcon` and render the actual Lucide icon instead of `{iconText}` text

**3. Update `AchievementPicker.tsx`**
- Import `getAchievementIcon` and render the Lucide icon next to each dropdown item instead of raw text

**4. Update `AdminAchievements.tsx` — Icon selector**
- Import `ACHIEVEMENT_ICON_MAP` to populate the icon dropdown
- Render the actual Lucide icon next to each option in the `<SelectItem>`
- Show a preview of the selected icon in the `<SelectTrigger>`

**5. Add Moderator Achievements page** (`src/pages/moderator/ModeratorAchievements.tsx`)
- Reuse the same `DefForm`, award, and management patterns from `AdminAchievements.tsx`
- Full CRUD on achievement definitions + ability to award/revoke (moderators already have RLS access via `has_role` checks on `player_achievements`)
- Note: `achievement_definitions` RLS is admin-only for writes. A migration will add a moderator write policy.

**6. Database migration** — Allow moderators to manage achievement definitions
```sql
CREATE POLICY "Moderators can manage achievement definitions"
ON public.achievement_definitions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));
```

**7. Wire up moderator routing**
- Add `{ to: "/moderator/achievements", label: "Achievements", icon: Award }` to `ModeratorSidebar.tsx`
- Add route in `App.tsx` pointing to the new page

### Files Modified
| File | Change |
|------|--------|
| `src/lib/achievementIcons.tsx` | **New** — shared icon map + helper |
| `src/components/shared/AchievementBadgeDisplay.tsx` | Use Lucide icons instead of text |
| `src/components/shared/AchievementPicker.tsx` | Use Lucide icons instead of text |
| `src/pages/admin/AdminAchievements.tsx` | Use shared icon map; show icon previews in selector |
| `src/components/player/PlayerAchievements.tsx` | Replace local `iconMap` with shared import |
| `src/pages/moderator/ModeratorAchievements.tsx` | **New** — full achievement management for mods |
| `src/components/moderator/ModeratorSidebar.tsx` | Add achievements link |
| `src/App.tsx` | Add moderator achievements route |
| **Migration SQL** | Add moderator write policy on `achievement_definitions` |

