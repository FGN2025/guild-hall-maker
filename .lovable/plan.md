# Surface the "Featured" toggle more prominently for Admins + Moderators

## Why

The capability to feature/unfeature a tournament, challenge, or quest already exists for both Admin and Moderator — it lives as a small star icon on each item's row/card. The complaint is that it's hard to find and there's no single place to see "what's currently featured on the homepage." Goal: make it obvious where to manage Featured Events without rebuilding any of the underlying mutations or permissions.

## Approach

Two complementary changes, both purely UI:

1. A new **"Featured Events" management screen** at `/moderator/featured` (Admin + Moderator) that aggregates every featured tournament, challenge, and quest in one list, with an unfeature/feature-more button per row.
2. **In-place visual upgrades** on the existing Tournament/Challenge/Quest manager screens so the star toggle is unmistakable and filterable.

Same DB writes as today (`is_featured` boolean), same role gating (Admin + Moderator). Nothing new server-side.

## Changes

### 1. New `/moderator/featured` page (also linked from Admin sidebar)
- Sections: Featured Tournaments / Featured Challenges / Featured Quests / Tenant Events.
- Each row shows cover image, title, type badge, status, start date (where applicable), and a single "Remove from Featured" button.
- A "+ Add to Featured" button at the top of each section opens a search dialog filtered by type so the moderator can pick from non-featured items and toggle them on without leaving the page.
- Empty-state per section: "Nothing featured yet — add one to surface it on the homepage."
- Live count chip: "5 items currently featured on the homepage."

### 2. Moderator/Admin sidebar entry
- Add **Featured Events** under the Compete group (visible to Admin + Moderator only). Star icon. Routes to `/moderator/featured`.
- Same link mounted in the Admin Dashboard quick-actions card.

### 3. Make the inline star toggle obvious
- On `ModeratorTournaments` and `AdminTournaments` (list + grid), `ModeratorChallenges`/`AdminChallenges`, and `AdminQuestsPanel`:
  - Replace the bare star icon with a labeled pill button: filled gold "★ Featured" when on, outlined "☆ Feature" when off.
  - Add a "Featured only" filter chip alongside the existing status filters so mods can quickly find what's currently surfaced.
  - Add a small "Featured on homepage" badge on the card hero (grid view) so featured items are visually distinct in the catalog itself.

### 4. Empty-state nudge on Featured Events homepage section
- The current empty state says "No featured events yet — check back soon!" Add an Admin/Moderator-only secondary CTA: "Manage Featured Events →" linking to `/moderator/featured`.

## Out of scope

- No DB schema changes. `is_featured` and the existing mutations stay as-is.
- No change to who can toggle (still Admin + Moderator). Tenant Admin / Marketing roles are not added.
- No reordering / priority weighting (Featured Events still orders by `start_date` / `created_at` as it does today). Happy to add a `featured_order` column if you want drag-to-reorder later.
- No changes to challenges/quests content rules — only their featured surfacing.

## Technical notes

- Files touched:
  - **New**: `src/pages/moderator/ModeratorFeaturedEvents.tsx`, route added in `src/App.tsx`, sidebar entry in `src/components/moderator/ModeratorSidebar.tsx` + `src/components/admin/...` if applicable.
  - **Modified**: `src/pages/moderator/ModeratorTournaments.tsx`, `src/pages/admin/AdminTournaments.tsx`, `src/pages/moderator/ModeratorChallenges.tsx`, `src/pages/admin/AdminChallenges.tsx`, `src/components/quests/AdminQuestsPanel.tsx`, `src/components/FeaturedEvents.tsx` (only the empty-state CTA).
- Reuses the existing `toggleFeaturedMutation` pattern in each manager so no new API surface is introduced.
- Access control is enforced via the existing `ModeratorRoute` wrapper — no RLS changes needed.
