# Fix prize redemption and provider assignment

## What is actually wrong

Two separate problems, both confirmed against the live database.

**1. Nobody can redeem prizes.**
The rule that decides whether a player is linked to an internet provider only looks at two places: provider staff records and matched billing subscribers. Right now there are zero players in the subscriber list with an account attached, and only 19 staff records. The provider you set in Admin > Users is stored in a third place (the provider-interest list, 1,345 records) which that rule never reads. So every real player fails the check and the redemption is refused.

**2. Provider assignments look like they don't stick.**
The admin user list loads the provider-interest records without paging. The data service caps that at 1,000 rows and there are 1,345, so roughly a quarter of users show a blank provider column no matter what you assign. The write itself succeeds — 47 assignments were saved in the last 30 days — the screen just can't see them.

## The fix

- Change the provider-link rule so the provider assigned in Admin > Users counts, alongside existing staff and subscriber links. Staff and subscriber links keep priority; the assigned provider is used otherwise. This immediately unlocks redemption for every player who has a provider on their record.
- Load all provider-interest records in the admin user list (paged), so the Provider column is accurate for every user and re-assignment reflects instantly.
- Keep everything else as-is: the approval flow, points deduction on approval, monthly limits, and the staff-only provider role column are untouched.

## Technical notes

- Migration: replace `public.get_user_tenant(uuid)` to add a third branch selecting `tenant_id` from `public.user_service_interests` at priority 3, ordered by `created_at`. Function stays `STABLE SECURITY DEFINER` with `search_path = public`. No table, grant, or policy change needed — the redemption insert policy already calls this function, and `useIsIspLinked` uses the same RPC.
- `src/hooks/useAdminUsers.ts`: page the `user_service_interests` fetch in 1,000-row batches (`.range()`) until exhausted; same for `tenant_admins` and `tenants` if they approach the cap.

## Verification

- Sign in as a player with an assigned provider and confirm the Prize Shop banner disappears and a redemption submits.
- Confirm a player with no provider still sees the browsing-only notice and is refused.
- In Admin > Users, confirm the Provider column is populated for users previously showing blank, and that assign / change / clear all reflect after saving.
