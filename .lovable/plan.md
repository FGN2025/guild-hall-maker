

## Fix: Challenge Points Not Awarded on Approval

### Root Cause

When an admin or moderator clicks "Approve All & Complete" on a challenge enrollment, the `updateStatusMutation` in both `AdminChallenges.tsx` and `ModeratorChallenges.tsx` only updates the `challenge_enrollments.status` to `"completed"`. It does **not**:

1. Insert a row into `challenge_completions` (which tracks awarded points)
2. Call `award-season-points` to credit the user's `season_scores`

The `challenge_completions` table and the `award-season-points` edge function both exist but are never invoked during challenge approval.

### Fix

Update the `updateStatusMutation` in **three files** (AdminChallenges, ModeratorChallenges, and AdminQuestsPanel's challenge equivalent) so that when status is set to `"completed"`:

1. Look up the challenge's `points_reward` (already available from the query context — `reviewChallengeId` is known)
2. Insert a row into `challenge_completions` with `user_id`, `challenge_id`, `awarded_points`, and `verified_by` (current user)
3. Call `award-season-points` edge function to credit the user's season score with the challenge's point value

### Changes

| File | Change |
|------|--------|
| `src/pages/admin/AdminChallenges.tsx` | In `updateStatusMutation`, when `status === "completed"`: fetch challenge `points_reward`, insert into `challenge_completions`, invoke `award-season-points` |
| `src/pages/moderator/ModeratorChallenges.tsx` | Same logic as above |
| `src/components/quests/AdminQuestsPanel.tsx` | Verify quest completion already awards XP (it does via `trg_quest_xp_on_completion` trigger) — no change needed |

### Detail

The mutation function changes from:
```typescript
mutationFn: async ({ enrollmentId, status }) => {
  await supabase.from("challenge_enrollments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId);
}
```

To (when status is "completed"):
```typescript
mutationFn: async ({ enrollmentId, status }) => {
  // 1. Get enrollment details (user_id, challenge_id)
  const { data: enrollment } = await supabase
    .from("challenge_enrollments")
    .select("user_id, challenge_id")
    .eq("id", enrollmentId).single();

  // 2. Update status
  await supabase.from("challenge_enrollments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", enrollmentId);

  // 3. If completing, award points
  if (status === "completed" && enrollment) {
    const { data: challenge } = await supabase
      .from("challenges")
      .select("points_reward, games(name)")
      .eq("id", enrollment.challenge_id).single();

    const points = challenge?.points_reward ?? 0;

    // Record completion
    await supabase.from("challenge_completions").insert({
      user_id: enrollment.user_id,
      challenge_id: enrollment.challenge_id,
      awarded_points: points,
      verified_by: user.id,
    });

    // Credit season score
    if (points > 0) {
      await supabase.functions.invoke("award-season-points", {
        body: {
          winner_id: enrollment.user_id,
          points_winner: points,
          game: challenge?.games?.name,
        },
      });
    }
  }
}
```

This ensures both the completion record and the season points are awarded atomically when a challenge is approved.

