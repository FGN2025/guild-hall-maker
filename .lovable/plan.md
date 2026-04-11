

## Update Admin and Player Guides with Challenge Filtering Feature

### Summary
Add documentation about the new URL-based game filtering on the Challenges page and the admin "Copy Share Link" button to both guides.

### Changes

**`src/pages/admin/AdminGuide.tsx`** — Challenges section (~line 501, after the "Players view active challenges" bullet)
- Add bullet: "Game Filter & Share Links — Use the Game filter dropdown on the Admin Challenges page to select a specific game, then click 'Copy Share Link' to generate a public URL (e.g. /challenges?game=American+Truck+Simulator). Share this link in emails or invitations so recipients land on a pre-filtered view showing only that game's challenges."
- Add bullet: "Filtered Stats — When a user opens a filtered link, the stats bar (Available, Enrolled, Completed, Progress) reflects only the filtered game's challenges, not the full catalog."

**`src/pages/PlayerGuide.tsx`** — Challenges section (~line 235, after the "Game-Specific" bullet)
- Add bullet: "Filtered Links — You may receive a link that takes you directly to challenges for a specific game (e.g. /challenges?game=Farm+Simulator+2025). The page will pre-select that game's tab and show only its challenges, stats, and progress."

### Scope
Two files, three new bullet points total. No database changes.

