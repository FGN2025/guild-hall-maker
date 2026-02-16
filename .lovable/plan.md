

# Enhanced Custom Badge System

## Overview

The database and basic admin UI for custom badges already exist. This plan focuses on polishing the experience: showing player names instead of UUIDs in recent awards, visually distinguishing custom badges on player profiles, streamlining the award flow, and displaying award notes.

## Changes

### 1. Fix Recent Awards to Show Player Names (AdminAchievements.tsx - AwardTab)

The recent awards table currently shows `a.user_id.slice(0, 8)...` which is not useful. Update `useRecentAwards` to join with `profiles` so we get `display_name` and `avatar_url` for each award.

**File: `src/hooks/useAchievementAdmin.ts`**
- Modify the `useRecentAwards` query: instead of `select("*")`, use a two-step approach -- fetch awards then batch-fetch profiles for the user_ids (since there's no FK, we can't use Supabase joins). Alternatively, fetch profiles separately and merge client-side.

**File: `src/pages/admin/AdminAchievements.tsx`**
- In the AwardTab, look up player names from a profiles map and display avatar + display_name instead of truncated UUIDs.

### 2. Separate Custom Badges Visually on Player Profiles (PlayerAchievements.tsx)

- Split the achievements grid into two sections: "Milestone Achievements" and "Special Recognition" (custom badges).
- Custom badges get a distinct visual treatment: a small ribbon/banner style or a unique accent color (e.g., purple/violet) so they stand out from tier-based milestone badges.
- Show the award note (reason) as a tooltip or small subtitle under the badge description for custom awards.

**File: `src/hooks/usePlayerAchievements.ts`**
- Add `category` and `notes` fields to the `Achievement` interface so the UI can differentiate and display them.

**File: `src/components/player/PlayerAchievements.tsx`**
- Group achievements by category (milestone vs custom).
- Render custom badges with a "Special Recognition" header and a distinct visual style (e.g., purple gradient border, sparkle icon indicator).
- Show `notes` text under the description for custom badges when available.

### 3. Streamline the Award Tab for Custom Badges (AdminAchievements.tsx)

- In the achievement dropdown, group options: show "Custom Badges" first with a separator, then "Milestone Achievements" below.
- Add a "Quick Create + Award" button that opens a combined dialog: create a new custom badge definition and immediately award it to the selected player in one step (saves admins from switching between tabs).

### 4. Add Bulk Award Support

- Allow selecting multiple players in the Award tab (checkbox-style multi-select from search results) so admins can award a badge like "Event MVP" to several players at once.

## Technical Details

### Updated Achievement Interface
```typescript
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: "trophy" | "flame" | "star" | "crown" | "target" | "shield" | "swords" | "zap" | "medal";
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  awardedBy?: string | null;
  category: "milestone" | "custom";  // NEW
  notes?: string | null;             // NEW
}
```

### Files Modified
1. **`src/hooks/useAchievementAdmin.ts`** -- Enhance `useRecentAwards` to fetch profile names alongside awards
2. **`src/hooks/usePlayerAchievements.ts`** -- Add `category` and `notes` to Achievement interface and query results
3. **`src/components/player/PlayerAchievements.tsx`** -- Split display into milestone vs custom sections, show notes, add distinct styling for custom badges
4. **`src/pages/admin/AdminAchievements.tsx`** -- Show player names in recent awards, group achievement dropdown, add quick-create-and-award flow, add multi-player selection

### No Database Changes Required
All needed columns (`category`, `notes`, `awarded_by`) already exist in the schema.

