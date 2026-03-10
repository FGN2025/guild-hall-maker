

## Update Guides with Quest System Documentation

Four guides need updates to document the Quest Chains, XP/Rank progression, AI narrative enhancement, and the "Challenges & Quests" rename. There is no separate Marketing Guide -- marketing documentation lives in the Admin Guide.

### 1. Player Guide (`src/pages/PlayerGuide.tsx`)

**Update the "Challenges & Quests" section** (currently at line 202) to add these bullets:
- Quest Chains -- explain sequential quest progression, lock/unlock mechanics, and chain completion bonuses
- XP & Rank System -- explain the 5 ranks (Novice, Apprentice, Journeyman, Expert, Master) and XP thresholds
- Story Narratives -- explain intro/outro flavor text shown during quest enrollment and completion
- Chain Progress -- explain the progress bar and quest-by-quest navigation within chains
- XP display on the Quests page header and rank badge on player profiles

### 2. Admin Guide (`src/pages/admin/AdminGuide.tsx`)

**Update the "Challenges" section** (line 403):
- Rename section title from "Challenges" to "Challenges & Quests"
- Add bullets for Quest Chains tab (CRUD for chains with name, description, story intro/outro, cover image, bonus points, optional achievement link)
- Add bullets for AI-enhanced narratives (Sparkles button on story_intro/story_outro fields in Create/Edit Quest dialogs, feeds game name + description + notebook context to AI)
- Add bullets for XP rewards and rank system management

**Update the "Notebook Connections" section** (line 350):
- Add bullet about game-specific notebook mapping (optional Game selector when adding/editing a connection)
- Explain that game-linked notebooks are used for RAG context in AI quest narrative generation

**Update permissions table** (line 583):
- Add row for "Quest Chains (Manage)" -- admin: true, marketing: false, manager: true

### 3. Moderator Guide (`src/pages/moderator/ModeratorGuide.tsx`)

**Update the "Challenges" section** (line 98):
- Rename section title to "Challenges & Quests"
- Add bullets for Quest Chains management (Chains tab, chain creation, ordering)
- Add bullets for AI narrative enhancement (Sparkles buttons on story fields)
- Add bullets for XP reward configuration on quests
- Note that quest chain completion bonuses are awarded automatically via database triggers

### 4. Tenant Guide -- No changes needed
Quests are not tenant-scoped features.

### Files to Edit
- `src/pages/PlayerGuide.tsx` -- expand Challenges & Quests section with chains, XP, narratives
- `src/pages/admin/AdminGuide.tsx` -- expand Challenges section, update Notebooks section, add permissions row
- `src/pages/moderator/ModeratorGuide.tsx` -- expand Challenges section with quest chain and AI narrative details

