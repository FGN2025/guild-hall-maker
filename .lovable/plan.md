

## Add "Copy Filtered Link" button to Admin Challenges page

### Summary
Add a game filter dropdown and a "Copy Link" button to the admin Challenges oversight tab. Admins select a game, click the button, and get a shareable URL like `/challenges?game=Farm+Simulator+2025` copied to their clipboard — ready to paste into emails or invitations.

### Changes

**`src/pages/admin/AdminChallenges.tsx`**
1. Add a new game filter `Select` dropdown (populated from unique game names in the challenges list) to the existing filter bar
2. Add a "Copy Filtered Link" button (with a `Link` or `Share2` icon) next to the filters
3. When clicked, it builds the public URL using the published domain (`https://guild-hall-maker.lovable.app/challenges?game=GameName`) and copies it to the clipboard with a toast confirmation
4. If no game is selected (showing "All Games"), the button copies the unfiltered `/challenges` link
5. The game filter also filters the displayed challenges in the admin table, consistent with the other filters

### UX
- The button label: **"Copy Share Link"** with a share icon
- Toast on copy: `"Filtered challenge link copied to clipboard!"`
- Works alongside existing search, difficulty, and status filters

