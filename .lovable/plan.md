# Quick Promo Review & Approval

Quick Promo currently creates a campaign with status `draft` and saves the rendered image straight into My Assets. Nothing gates it. This adds a required review step, decided by Tenant Admins and Managers, surfaced in the existing review queue on Marketing > Agent.

## How it will work

1. **Marketing staff create a Quick Promo** (from Challenges, Events, or Tournaments). The campaign is created as **Pending review** instead of Draft, and the rendered asset is saved unpublished.
2. **The draft appears in the review queue** on Marketing > Agent, alongside AI drafts. The tab and panel are relabelled "Review" so it clearly covers both AI-generated and staff-generated promos.
3. **Admins and Managers approve or reject** with the existing approve/reject buttons and optional feedback note. Approve publishes the campaign and its asset; reject sends it back with the note visible to the creator.
4. **Marketing-only users see the queue read-only** — their pending items are listed with status and any feedback, but the approve/reject buttons are hidden and blocked server-side.
5. **Nothing pending is visible to players.** Only approved/published campaigns and published assets surface publicly.

Rejected items stay visible for 30 days (matching current behaviour) so the creator can see the feedback, fix it, and resubmit.

## Technical notes

- **Database**: add an RLS policy update on `marketing_campaigns` and `tenant_marketing_assets` so that transitions into `approved`/`published` (and setting `is_published = true`) require `is_tenant_admin_or_manager()`. Marketing members keep insert rights and update rights limited to items still in `pending_review`/`rejected` that they created. Grants stay as-is.
- **Quick Promo call sites** (`src/pages/tenant/TenantChallenges.tsx`, `src/pages/tenant/TenantEvents.tsx`, `src/components/marketing/TenantPromoPickerDialog.tsx`): change `status: "draft"` to `status: "pending_review"` and keep the asset insert unpublished.
- **`src/components/tenant/AgentDraftsPanel.tsx`**: drop the `.not("agent_source", "is", null)` filter so human-created pending drafts also load; add a source badge ("AI" vs "Quick Promo"); hide decision controls when the viewer is not admin/manager (via `useTenantAdmin`).
- **`src/hooks/useDraftDecision.ts`**: unchanged decision logic; on approve it already flips campaign status and publishes the linked asset — verify it handles a campaign with no `agent_source`.
- **`src/pages/tenant/TenantMarketing.tsx`**: rename the "Agent" tab to "Review" and show a pending-count badge.
- **`src/pages/tenant/TenantGuide.tsx`**: add a What's New entry and update the Challenges/Marketing sections and role permissions to describe the approval step.
