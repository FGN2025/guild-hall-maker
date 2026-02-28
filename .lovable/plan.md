

## Update Player Guide with Missing Features

### Overview
Add missing documentation to the Player Guide covering Discord account linking, dark/light theme, password reset, legal pages, and cookie consent. Also expand the existing Profile Settings section.

### Changes (single file: `src/pages/PlayerGuide.tsx`)

#### 1. Expand "Profile Settings" section
Add bullets covering:
- Discord Linking -- how to link/re-link/unlink Discord from the Profile Settings page
- Discord avatar and username display once linked
- Warning that unlinking Discord blocks platform access until re-linked
- Notification preferences toggle (in-app and email) accessible from Profile Settings

#### 2. Add new section: "Dark & Light Theme"
- Theme toggle location (sidebar footer, sun/moon icon)
- Preference is saved and persists across sessions
- Applies site-wide immediately

#### 3. Add new section: "Password Reset"
- How to initiate a password reset from the login page
- Email verification flow
- Link to /reset-password

#### 4. Add new section: "Legal & Policies"
- Terms and Conditions (/terms)
- Privacy Policy (/privacy)
- Acceptable Use Policy (/acceptable-use)
- Disabled Users Notice (/disabled-users)
- Footer links on the home page
- Cookie consent banner and what it means

#### 5. Import additional icons
Add `Moon`, `Scale`, `Lock` (or similar) icons for the new sections.

### Technical Details

**Modified file:** `src/pages/PlayerGuide.tsx`
- Add 3 new entries to the `sectionData` array (Theme, Password Reset, Legal/Policies)
- Expand the existing `profile-settings` entry with Discord and notification preference bullets
- Add corresponding icon imports from `lucide-react`

No other files need changes. The Admin Guide does not need updates for these player-facing features.

