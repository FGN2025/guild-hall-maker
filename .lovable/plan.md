

## Legal Pages and Footer Update

### What Already Exists
- **Terms and Conditions** (`/terms`) -- fully built
- **Privacy Policy** (`/privacy`) -- fully built

### What Will Be Created

#### 1. Acceptable Use Policy (`/acceptable-use`)
A new page following the same visual pattern (glass-panel, back link, download button, Gamepad2 icon) covering:
- Prohibited activities (cheating, harassment, exploits, spam)
- Account sharing and multi-accounting rules
- Content standards for community posts and media
- Consequences of violations (warnings, suspensions, bans)
- Reporting procedures
- FGN's right to modify the policy

#### 2. Disabled Users Notice (`/disabled-users`)
A new page covering accessibility and account disability information:
- Commitment to accessibility (WCAG compliance goals)
- Assistive technology compatibility
- Account suspension/disability process and appeals
- How to request accommodations
- Contact information for accessibility concerns

### What Will Be Updated

#### 3. Footer on Index Page
Update the existing footer to include all four legal links in a clean layout:
- Terms & Conditions
- Privacy Policy
- Acceptable Use Policy
- Disabled Users Notice

#### 4. Routes in App.tsx
Add two new routes:
- `/acceptable-use` -> `AcceptableUsePolicy`
- `/disabled-users` -> `DisabledUsersNotice`

### Technical Details

**New files:**
- `src/pages/AcceptableUsePolicy.tsx` -- mirrors Terms.tsx structure
- `src/pages/DisabledUsersNotice.tsx` -- mirrors Terms.tsx structure

**Modified files:**
- `src/App.tsx` -- add imports and routes for the two new pages
- `src/pages/Index.tsx` -- expand the footer with all four legal links

All pages will use the same styling conventions: `glass-panel`, `grid-bg`, `font-display` headings, `prose prose-invert` content, and the Download PDF button.

