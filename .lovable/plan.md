

## Fix: Share link uses hardcoded domain — doesn't work in preview

### Problem
The "Copy Share Link" button hardcodes the published domain (`https://guild-hall-maker.lovable.app`). When you test the link in the Lovable preview environment (which runs on a different domain), you're either:
1. Opening the published site (which may have an older deployment without the filtering code)
2. Or testing by navigating within the preview, where the URL doesn't include the `?game=` parameter

### Fix

**`src/pages/admin/AdminChallenges.tsx`**
- Replace the hardcoded domain with `window.location.origin` so the share link works in whichever environment you're currently in (preview or published)
- Change: `const base = "https://guild-hall-maker.lovable.app/challenges"` → `const base = \`${window.location.origin}/challenges\``

This single-line change ensures the copied URL matches the environment you're testing in. Once published, the link will automatically use the published domain.

### Scope
One file, one line change. No database changes.

