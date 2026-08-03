# Tenant Challenge Scheduling & Promotion

Let tenant admins and tenant marketing staff take challenges from the platform catalog, open them to their own players for a specific date window, and generate promo assets from them — without giving tenants the ability to author challenge content.

## Effort assessment

Medium. Roughly one focused build session. No changes to challenge authoring, points, tasks, or evidence review. The work is one new table, one enrollment gate, one tenant page, and a Quick Create source addition.

| Area | Effort |
| --- | --- |
| Database (new scheduling table + access rules) | Small |
| Enrollment window enforcement | Medium — touches shared player-facing enrollment path |
| Tenant scheduling page | Medium |
| Quick Create parity for challenges | Small-Medium |

## What tenants get

**Tenant admin / tenant marketing** see a new **Challenges** page in the tenant sidebar:

- Browse the active platform challenge catalog (read-only content — name, game, difficulty, points, tasks).
- Schedule one into a window: start date, end date, optional headline and promo blurb, optional featured flag.
- See their scheduled windows as a list with status (Upcoming / Open / Closed) and edit or cancel them.
- Quick Create (lightning icon) on any scheduled challenge generates a promo asset and a linked draft campaign, exactly like tenant events do today.

**Players in that tenant** see the challenge marked with its availability window and can only enroll while the window is open.

## Enforcement rule

A tenant challenge window is a hard gate for that tenant's players:

- Before start: challenge shows "Opens Aug 10" and the enroll button is disabled.
- During window: normal enrollment and submission.
- After end: enrollment closed; already-enrolled players keep access to finish and submit evidence (closing a window must not strand in-flight work).
- Players with no tenant, and platform staff, are unaffected — the existing global `start_date` / `end_date` on the challenge still applies to them.

## Technical detail

**New table `public.tenant_challenge_schedules`**
- `tenant_id`, `challenge_id`, `starts_at`, `ends_at`, `headline`, `promo_copy`, `is_featured`, `created_by`
- Unique on (`tenant_id`, `challenge_id`, `starts_at`) so re-runs of the same challenge in a later window are allowed
- Grants: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `SELECT` to `anon` (windows are public promo info, consistent with the existing anon read of active challenges); `ALL` to `service_role`
- RLS: read allowed for anyone; write restricted to `is_tenant_admin_or_manager(tenant_id, auth.uid())` or `is_tenant_marketing_member(tenant_id, auth.uid())`, plus platform `admin` / `moderator`
- Validation trigger enforcing `ends_at > starts_at` and that the referenced challenge is active (trigger, not CHECK, since it is data-dependent)

**Enrollment gate**
- New security-definer function `challenge_window_open(_challenge_id uuid, _user_id uuid)` — resolves the user's tenant via the existing `get_user_tenant`, returns true when there is no schedule row for that tenant/challenge, or when `now()` falls inside one
- Add it to the `challenge_enrollments` INSERT policy alongside `auth.uid() = user_id`. Existing UPDATE policies are left alone so in-flight enrollments can still be completed after a window closes
- `useChallengeEnrollment` and `ChallengeDetail` / `ChallengeCard` read the window and disable the enroll action with a reason, so the RLS rejection is never the first thing a player hits

**Tenant UI**
- `src/pages/tenant/TenantChallenges.tsx` plus `src/hooks/useTenantChallengeSchedules.ts` (list / create / update / delete, following `useTenantEvents`)
- Route `/tenant/challenges` guarded the same way `/tenant/marketing` is; sidebar entry added
- Date inputs use the shadcn date picker pattern

**Quick Create parity**
- Add `source_challenge_id` to `marketing_campaigns` (nullable, FK to `challenges`) so challenge-sourced campaigns are linkable the way event- and tournament-sourced ones are
- `TenantPromoPickerDialog` gains a Challenges tab: same `composePromoLayout` scene, fed from the scheduled challenge (name, game, window start, points total as the prize line), same idempotency-keyed draft campaign creation

## Explicitly out of scope

- Tenants creating, editing, or deleting challenge content or tasks
- Tenant-specific point values or evidence rules
- Tenant-scoped challenge leaderboards
