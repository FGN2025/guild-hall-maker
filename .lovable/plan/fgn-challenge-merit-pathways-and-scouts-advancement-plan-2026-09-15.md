# FGN Challenge Merit Pathways and Scouts Advancement Plan

## Goal

Turn the current challenge catalog into clear, game-based development pathways where every player can understand:

```text
Choose a game → discover a pathway → complete verified challenges
→ earn FGN merits → see skills demonstrated → choose a next step
```

For a Scouts of America tenant, add a stricter advancement layer:

```text
FGN challenge evidence → mapped Scout requirement evidence
→ registered counselor review → requirement credit recorded
→ merit badge completion → digital record and physical-award workflow
```

FGN merits will be available across the platform. The Scouts experience will be a tenant-branded, more thorough implementation with official requirement mappings, counselor decisions, and advancement records. A game challenge will never claim to award an official merit badge by itself; official credit is recorded only after the authorized Scouts review process.

## Confirmed starting point

- The live catalog has **119 challenges**, **106 active challenges**, and **483 tasks** across **11 games**.
- All 483 tasks currently use manual verification; no task is configured for Steam achievement or playtime verification.
- Only 18 challenges have skill tags, 10 have an Academy next step, and 3 are connected to an FGN achievement badge.
- The player page presents one long, flat card catalog. It can filter by game, but does not organize challenges into pathways, merit levels, or recommended sequences.
- Submitted evidence currently counts toward the visible task-progress total before approval. The redesigned progress model will distinguish attempted, submitted, verified, and officially credited work.
- Existing enrollment, evidence upload, Steam connection, moderation, FGN Academy sync, tenant branding, points wallet, and challenge scheduling will be preserved and extended rather than replaced.

## Product model

### 1. Universal FGN merit system

Add a platform-wide structure above individual challenges:

- **Pathway** — a game or career-oriented journey such as Flight Scout, Construction Explorer, Transportation Specialist, or AgTech Explorer.
- **Merit** — a named competency within a pathway, with its own icon, description, level, and required challenge set.
- **Levels** — a consistent progression such as Discover, Develop, and Deploy, rather than relying only on Beginner/Intermediate/Advanced labels.
- **Challenge contribution** — each challenge states which merit and skills it advances, how much progress it provides, and what evidence is required.
- **Verified progress** — player progress is based on approved or automatically verified task evidence, not merely an uploaded file.
- **Career bridge** — each completed merit identifies demonstrated skills and, where available, a specific FGN Academy next step.

Points remain the spendable/lifetime economy already used by FGN. Merits are a separate record of demonstrated ability and must not be converted into prize currency.

### 2. Scouts advancement layer

Create tenant-scoped advancement programs that can map FGN work to the current official Scouts merit-badge requirements:

- Store the official merit badge, requirement number, requirement text, source URL, effective version/year, and retirement status.
- Map a challenge task to a requirement as **practice**, **supporting evidence**, or **potentially satisfies**. Only the last category may enter formal counselor review.
- Preserve the exact requirement version used when work was completed; later requirement changes must not rewrite historical credit.
- Support partial completion at the individual requirement/sub-requirement level. Partials do not expire before the Scout turns 18, and a subsequent approved counselor may accept or reassess them.
- Keep the player’s original evidence, verification source, timestamps, reviewer, decision, notes, and decision history.
- Record the Scout’s unit-leader discussion and authorization before the formal counselor workflow begins.
- Restrict official requirement approval to an adult registered as a merit badge counselor, approved by the council for that specific badge, current on required youth-protection training, and within their annual approval period. Tenant admins and unit leaders do not automatically become counselors.
- Represent counselor assignments separately from public profiles. Counselor rosters and contact details are available only to authorized unit/council staff, not as a Scout-browsable directory.
- Preserve the required adult interactions and signatures when the platform serves as an alternative to the blue card; a digital checklist alone is not sufficient.
- Treat “show,” “demonstrate,” “discuss,” “make,” and similar requirement verbs literally. Uploaded evidence or a Steam signal can support review but cannot substitute for an individually required conversation or demonstration.
- Mark badges with special supervision, certification, facility, or safety requirements and block unsupported digital-only completion paths.
- Apply youth-protection controls to communication and virtual sessions: no one-to-one adult/youth messaging or meetings, required parent/guardian or authorized-adult participation, and an auditable participant record.
- Separate **digital completion record**, **badge eligible**, **recorded with Scouts**, and **physical badge issued** states.
- Do not represent the platform as an official Scouts system of record or automatically update an external Scouts record unless a later authorized integration is supplied.

The uploaded 2025 *Scouts BSA Requirements*, Guide to Advancement Section 7, Merit Badge Counselor Information form, and counselor approval best practices are now part of the governing reference set. The current requirements on scouting.org remain authoritative when they differ from a yearly book or pamphlet. Digital Resource Guides are supporting learning materials, not requirement replacements. Every imported mapping will carry provenance and require human approval.

## First pilot pathways

Research and design all four selected pilots, then release them one pathway at a time:

1. **Flight & Aviation** — Microsoft Flight Simulator 2024.
2. **Construction Trades** — Construction Simulator, House Flipper, House Flipper 2, and Electrician Simulator.
3. **Transportation & Logistics** — American Truck Simulator.
4. **Agriculture & Technology** — Farming Simulator 2025 and The Farmer Was Replaced.

For each game, produce a review sheet before changing catalog data. Each row will include:

- current challenge and task;
- proposed pathway, merit, and level;
- player-friendly objective and success criteria;
- FGN skill tags;
- relevant Steam achievement/playtime signal;
- proposed Scouts badge requirement and mapping strength;
- official requirement source and version;
- verification method and required human review;
- useful YouTube learning resource, when available;
- Discord/community difficulty context, when credible;
- specific FGN Academy continuation;
- keep, merge, rewrite, deactivate, or create recommendation.

Steam is the primary source for objective game verification. Official Scouts sources govern merit requirements. YouTube supports instruction. Discord may inform terminology or difficulty but can never establish official requirements or approval.

## Player experience

Use the supplied Flight Scout concept as structural inspiration while retaining FGN’s established dark arcade palette, typography, and semantic design tokens.

### Challenge hub

- Replace the 106-card wall with a game-first pathway browser.
- Show a featured pathway banner with the game, pathway identity, earned merit, next merit, verified progress, and recommended next challenge.
- Add clear views for **Explore**, **In Progress**, **Awaiting Review**, and **Completed**.
- Filter by game, pathway, level, merit, skill, verification type, and available/complete state.
- Group challenges into ordered pathway lanes rather than one global display order.
- Keep tenant-scheduled availability visible without exposing enrollment counts to unauthorized roles.

### Challenge cards

Each card will show the information a player needs before opening it:

- game and pathway;
- merit and level;
- challenge objective;
- verified task progress;
- estimated time;
- points reward;
- skills demonstrated;
- Steam-verifiable versus counselor/manual evidence;
- locked, available, submitted, revision-needed, or complete state;
- one clear action.

### Challenge detail

Reorganize the detail page around the player’s job to be done:

1. What this challenge proves.
2. Which FGN merit and skills it advances.
3. For Scout tenants, which official requirement evidence it may support.
4. Ordered tasks with explicit completion criteria and verification source.
5. Separate progress totals for completed, submitted, and verified tasks.
6. Evidence capture and reviewer feedback beside the relevant task.
7. Reward, next merit, and Academy/career continuation.

### Scouts-branded experience

- Apply Scouts tenant branding and approved marks only from supplied brand assets.
- Add Scout-facing terminology and advancement progress without changing the universal FGN core.
- Provide a Scout progress record showing requirements completed, partials, counselor decisions, dates, and outstanding work.
- Provide leader/counselor queues organized by Scout, badge, requirement, and age of submission.
- Offer a printable/exportable advancement summary and physical-award fulfillment checklist after official approval.

## Administration and controls

### FGN challenge managers

- Create and manage pathways, merits, levels, challenge sequencing, prerequisite rules, skill mappings, research provenance, and Academy next steps.
- Compare the current catalog with proposed mappings in a review workspace.
- Approve changes game by game; no bulk catalog rewrite without review.
- Preview both the universal player view and a Scouts tenant view before publishing.

### Scouts tenant staff

- Configure which approved FGN pathways participate in the Scouts program.
- Maintain tenant branding and local program settings.
- Record council approval of counselors in two stages: registered counselor status and badge-specific authorization, including effective/expiration dates, qualifications, training currency, and any required safety credentials.
- Record the unit-leader conversation and provide at least one approved counselor contact while preserving the Scout’s choice among approved counselors.
- Review evidence, grant requirement credit, return work with guidance, and record partials.
- Keep guest experts and instructors distinct from approved counselors; they may assist but cannot sign requirements.
- Mark counselor completion, unit-leader acknowledgement, external advancement recording, and physical badge issuance as separate steps.
- Export an auditable digital equivalent of the blue-card record for the Scout, counselor, and authorized advancement staff.

### Access boundaries

- Keep platform authoring with platform admins/moderators.
- Keep Scouts advancement decisions tenant-scoped.
- Store advancement permissions in a dedicated tenant role/assignment structure, not profiles, browser storage, or the general user profile.
- Players may see only their own detailed advancement record; counselors see only authorized Scouts and badges; platform administrators retain oversight without silently becoming the approving counselor.
- Unit/council staff can access the counselor roster needed to make assignments; Scouts cannot browse the roster or counselor contact database directly.
- Use row-level access rules and immutable decision history for youth data and advancement records.

## Data and technical work

### New structured records

Introduce normalized records for:

- pathways and pathway levels;
- merits and required challenge relationships;
- player merit progress and awards;
- tenant advancement programs;
- official badge definitions and versioned requirements;
- task-to-requirement mappings with evidence strength;
- counselor badge assignments;
- counselor registration, annual approval, qualifications, training, and special-certification records;
- unit-leader authorizations and counselor referrals;
- requirement submissions, decisions, partials, and audit history;
- counseling-session participant and safeguarding records without storing unnecessary private conversation content;
- external recording and physical-award status.

Every new public table will include explicit grants, row-level access policies, tenant isolation, and service-role access only where a server function requires it.

### Existing records to extend

- Challenges: pathway, merit contribution, level, prerequisite/sequence, player outcome, and research provenance.
- Tasks: explicit success criteria, skill evidence, learning resource, and verification rule.
- Existing achievements: retain FGN platform achievements, but do not overload them as official Scout merit badges.
- Completion flow: calculate merit advancement only from verified task outcomes; route Scouts mappings into counselor review.

### Verification

- Connect eligible tasks to real Steam achievements or playtime only after the research sheet is approved.
- Keep manual evidence for requirements Steam cannot prove.
- Never let an automatic Steam match grant official Scout requirement credit without the configured counselor decision.
- Require a counselor to attest that the Scout actually and personally completed each official requirement exactly as written; automatic checks can only supply supporting evidence.
- Do not auto-expire partial Scout credit before age 18. Preserve its original counselor and completion date when another counselor continues the badge.
- Add validation that a published challenge has a pathway, outcome, task criteria, skill mapping, and valid verification configuration.

## Delivery sequence

### Phase 0 — Close prerequisites

- Finish the open run-reliability checkpoint and remove its remaining scratch fixtures before challenge catalog writes begin.
- Confirm the Scouts partnership authority, approved naming/branding, counselor workflow, and whether external advancement-system integration is permitted.
- Confirm which council or advancement committee owns counselor approval for the pilot and how annual registration/training status will be supplied and refreshed.

### Phase 1 — Information architecture and research package

- Define the universal FGN pathway/merit taxonomy and the Scouts advancement overlay.
- Research all four pilot pathways from Steam, official Scouts sources, YouTube, and limited community context.
- Deliver the requested review sheets; make no catalog changes until approved.

### Phase 2 — Data foundation and access rules

- Add versioned merit, pathway, mapping, counselor, decision, and audit records.
- Add migration and access tests for platform, tenant admin, counselor, player, and guest boundaries.
- Backfill classification proposals only for rows approved in Phase 1, using idempotent writes and preserving existing enrollments/completions.

### Phase 3 — Universal challenge experience

- Build the pathway hub, progression banner, filters, redesigned cards, challenge detail, verified-progress calculation, and mobile states.
- Keep existing points, enrollments, evidence, scheduling, and guest browsing behavior intact.

### Phase 4 — Scouts tenant experience

- Add Scouts branding, requirement mappings, counselor review, partial completion, advancement record, and award-status workflow.
- Validate the experience with a dedicated Scouts test tenant before any real Scout records are entered.

### Phase 5 — Pilot and controlled rollout

- Pilot one pathway at a time in this order: Flight, Transportation, Construction, Agriculture & Technology.
- Require sign-off on mapping accuracy, youth-data access, counselor workflow, and terminology before enabling the next pathway.
- Measure discovery-to-enrollment, task completion, evidence rejection/rework, merit completion, Academy continuation, and counselor turnaround.

## Validation and acceptance

- Desktop and mobile visual checks match the supplied dense pathway/progression direction without copying the reference artwork.
- A player can identify the next challenge and what it proves within one screen.
- Progress never treats unapproved evidence as verified.
- Existing enrollments, completions, points, and evidence remain intact after classification.
- Steam verification cannot produce official Scout credit by itself.
- Unauthorized tenant staff cannot view or approve Scout advancement records.
- A counselor whose annual approval, youth-protection training, badge authorization, or required certification is not current cannot sign new requirement credit.
- No adult/youth communication or virtual-session feature permits an unrecorded one-to-one interaction.
- Partials remain available through the Scout’s eligibility period and retain requirement, version, counselor, and completion-date provenance.
- Requirement versions and all counselor decisions remain auditable.
- Guest users see the challenge opportunity but no private progress, evidence, counselor, or tenant records.
- No changes touch marketing automation, scheduled posting, approvals, dispatch, or the kill switch.

## Explicitly out of scope for this effort

- Automatically declaring a Scout merit badge earned from gameplay alone.
- Replacing the official Scouts advancement system without an authorized integration agreement.
- Publishing unreviewed mappings or changing all 119 challenges in one operation.
- Reusing official badge artwork without supplied permission and assets.
- Changing prize-point economics, marketing automation, or tenant social publishing.
