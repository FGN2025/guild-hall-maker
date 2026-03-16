

## Overview

Two deliverables:
1. **Update all four user guides** to ensure Game Servers documentation is present and consistent across Player, Admin, Moderator, and Tenant guides
2. **Create a new White Paper page** — a public-facing document pitching FGN as a turnkey platform for schools, community centers, and libraries to run tournaments, challenges, and quests

---

## 1. Guide Updates

All four guides already exist and are comprehensive. The main gap is ensuring the **Game Servers** section is present and up-to-date across all guides. Current state:

| Guide | Game Servers Section? | Notes |
|---|---|---|
| Player Guide | Yes | Already has `/game-servers` section with live status, copy IP, how-to-join |
| Admin Guide | Yes | Has server management + Shockbyte setup instructions |
| Moderator Guide | No | Missing — moderators may need awareness of servers |
| Tenant Guide | No | Missing — tenants may want to promote servers at events |

**Changes:**
- **Moderator Guide** — Add a brief Game Servers awareness section (moderators don't manage servers but should know they exist for player support)
- **Tenant Guide** — Add a section noting that tenants can reference game servers in event descriptions
- **All guides** — Minor consistency pass to ensure the `/game-servers` route alias is mentioned alongside `/servers`

---

## 2. White Paper Page

Create a new public page at `/white-paper` accessible without login, designed as a professional pitch document for institutional adoption.

**Structure:**
- **Hero section** with title "Bring Competitive Gaming to Your Community" and subtitle targeting schools, libraries, and community centers
- **Executive Summary** — What FGN is, the value proposition for institutions
- **The Problem** — Youth engagement, after-school programming gaps, digital literacy needs
- **The Solution** — How tournaments, challenges, and quests create structured, safe competitive environments
- **Key Features** (accordion sections):
  - Tournaments — Organized brackets, automated scoring, seasonal rankings
  - Challenges — Task-based objectives with evidence submission, skill-building
  - Quests — Story-driven progressions, XP ranks, achievement badges
  - Game Server Directory — Dedicated hosted servers for supervised play
  - Leaderboards & Stats — Performance tracking and analytics
  - Prize Shop — Incentive system with redeemable rewards
  - AI Coach — Personalized strategy guidance
  - Community Forum — Moderated discussion space
- **Implementation Models** — How a school, library, or community center would set up (tenant onboarding, ZIP-based enrollment, moderator roles)
- **Safety & Moderation** — Content moderation, age-appropriate controls, AUP enforcement
- **Success Metrics** — What institutions can track (participation, engagement, skill growth)
- **Getting Started** — Call to action with contact information
- **Export PDF** button matching the guide pattern

**Technical approach:**
- New file: `src/pages/WhitePaper.tsx` — static content page using the same accordion/search/print pattern as existing guides
- Route: Add `/white-paper` under `ConditionalLayout` in `App.tsx` (accessible to guests and authenticated users)
- No database changes needed — purely static content

---

## Files to Create/Edit

| File | Action |
|---|---|
| `src/pages/WhitePaper.tsx` | Create — white paper page |
| `src/pages/moderator/ModeratorGuide.tsx` | Edit — add Game Servers section |
| `src/pages/tenant/TenantGuide.tsx` | Edit — add Game Servers awareness section |
| `src/App.tsx` | Edit — add `/white-paper` route |

