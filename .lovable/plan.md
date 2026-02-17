
# Player User Guide Page

## Overview
Create a dedicated "Player Guide" page accessible from the sidebar that provides a comprehensive, well-organized reference for all player-facing features in FGN. The guide will use accordion sections for easy navigation and will be styled consistently with the existing app design.

## What the Guide Will Cover

1. **Getting Started** -- Account setup, profile settings (display name, gamer tag, avatar)
2. **Dashboard** -- Overview of stats cards, registered tournaments, recent matches
3. **Tournaments** -- Browsing, searching/filtering, registering/unregistering, viewing brackets, creating tournaments
4. **Calendar** -- Viewing tournament schedule
5. **Games** -- Browsing game catalog, viewing game details and guides
6. **Community** -- Creating topics, replying, liking posts, categories
7. **Leaderboard** -- All-time and seasonal rankings, sorting/filtering
8. **Season Stats** -- Seasonal performance data, charts, progression tracking
9. **Compare** -- Head-to-head player comparison, sharing comparison links
10. **Achievements / Badges** -- Milestone tiers (bronze/silver/gold/platinum), special recognition badges, achievements leaderboard
11. **AI Coach** -- How to open and use the AI coaching assistant
12. **Profile Settings** -- Updating display name, gamer tag, and avatar

## Technical Details

### New Files
- **`src/pages/PlayerGuide.tsx`** -- The guide page component using Accordion from `@/components/ui/accordion` to organize sections. Each section will have an icon, title, and descriptive content with tips. Styled with existing `font-display`, `font-heading`, `glass-panel` classes.

### Modified Files
- **`src/App.tsx`** -- Add route `/guide` inside the authenticated `AppLayout` block, importing `PlayerGuide`
- **`src/components/AppSidebar.tsx`** -- Add a "Player Guide" link (using `BookOpen` icon from lucide-react) to the `mainNav` array

### Design Approach
- Uses existing Accordion UI component for collapsible sections
- Each section gets a relevant lucide icon
- Content is static text (no database needed)
- Consistent styling with the rest of the app (font-display headings, font-heading body, muted-foreground for secondary text)
- Mobile-responsive layout
