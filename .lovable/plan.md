## Plan

### 1. Update `updateStatusMutation` on both review pages

In both `src/pages/moderator/ModeratorChallenges.tsx` and `src/pages/admin/AdminChallenges.tsx`, extend `updateStatusMutation` so when the enrollment status flips, the underlying `challenge_evidence` rows are flipped to match. This eliminates the "still pending" badges after an enrollment is approved/rejected.

After the existing `challenge_enrollments` update succeeds and before the points/notification side effects:

```ts
if (status === "completed") {
  await supabase.from("challenge_evidence")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("enrollment_id", enrollmentId)
    .neq("status", "approved");
} else if (status === "rejected") {
  await supabase.from("challenge_evidence")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("enrollment_id", enrollmentId)
    .eq("status", "pending");
}
```

Then in `onSuccess`, also invalidate `["mod-review-enrollments"]` (and the admin equivalent) so per-task badges re-render immediately.

### 2. Backfill migration

One-time SQL to fix historical records (e.g. RacerX's FS25 Bronze) where the enrollment was already marked completed but evidence stayed pending:

```sql
UPDATE public.challenge_evidence ce
SET status = 'approved', reviewed_at = now()
FROM public.challenge_enrollments en
WHERE ce.enrollment_id = en.id
  AND en.status = 'completed'
  AND ce.status = 'pending';

UPDATE public.challenge_evidence ce
SET status = 'rejected', reviewed_at = now()
FROM public.challenge_enrollments en
WHERE ce.enrollment_id = en.id
  AND en.status = 'rejected'
  AND ce.status = 'pending';
```

No schema or RLS changes — moderators/admins already have update rights on `challenge_evidence` via the existing per-evidence approval flow.

### Files

- `src/pages/moderator/ModeratorChallenges.tsx` — extend `updateStatusMutation`, add cache invalidation.
- `src/pages/admin/AdminChallenges.tsx` — same change.
- New migration — backfill historical evidence rows.
