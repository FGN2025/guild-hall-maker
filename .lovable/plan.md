

## Update Marketing Guide with Social Publishing & Scheduling Features

### What Changes

**1. Update the "Marketing Dashboard" section** (lines 494-511)
Add bullets covering:
- Social Accounts tab — connect Facebook, Instagram, Twitter/X, LinkedIn with API tokens
- Format-aware publishing — the Asset Editor's Publish dropdown filters platforms by canvas format (Square → Instagram/Facebook/Twitter, Landscape → Facebook/Twitter/LinkedIn, Story → Instagram/Facebook)
- Caption field — add post text when publishing or scheduling
- Schedule for Later — pick a future date/time from the Asset Editor to queue a post
- Scheduled Posts tab — calendar/list view of queued posts with status indicators (pending, published, failed), cancel and reschedule actions
- Automated delivery — a backend job processes the queue every 5 minutes

**2. Update the "Media Library" / Asset Editor bullets** (lines 271-293)
Add a bullet about the Publish dropdown and Schedule option in the Asset Editor footer, alongside Download and Save as New Asset.

**3. Update the permissions table** (lines 568-609)
Add rows for:
- `Social Accounts (Connect/Manage)` — admin: ✅, marketing: ✅, manager: ❌
- `Scheduled Posts (View/Manage)` — admin: ✅, marketing: ✅, manager: ❌

**4. Add imports**
Add `Share2` and `CalendarClock` icons (already imported as `CalendarDays` exists, need `Share2`).

### Files Modified
- `src/pages/admin/AdminGuide.tsx` — update sectionData bullets and permissionRows

