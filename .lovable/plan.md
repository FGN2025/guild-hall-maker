

## Make Tournament Cards Semi-Transparent

### Goal
Allow the page background image to be slightly visible through the tournament cards, matching the frosted-glass aesthetic shown in the reference screenshot.

### Changes

**File: `src/components/tournaments/TournamentCard.tsx` (line 41)**
- Change the outer card div's classes from `bg-card` to `bg-card/70 backdrop-blur-sm`
- This makes the card 70% opaque with a subtle blur, letting the background image peek through -- consistent with the project's glassmorphism style noted in the visual identity guidelines.

### Result
Tournament cards will have a subtle transparency effect, allowing the page background image to show through slightly while maintaining full readability of card content.

