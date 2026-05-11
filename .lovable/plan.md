## Assessment

Both symptoms in the screenshot are working-as-coded — but the UI hides the *why*, which is the real fix.

### Issue 1 — No Approve button for FS25 – Bronze

The enrollment badge in the screenshot reads **"Enrolled"**, not "Submitted". In `src/pages/moderator/ModeratorChallenges.tsx` the per-evidence Approve/Reject row (line 595) and the enrollment-level "Approve All & Complete" button (line 642) are both gated on:

```
enrollment.status === "submitted"
```

The player (RacerX) uploaded evidence for two of three tasks but never tapped **Submit for Review** on `/challenges/:id` (which calls `submitForReviewMutation` in `useChallengeEnrollment.ts` and flips status to `submitted`). Until that happens, moderators cannot approve — by design. This is also why the prior ATS Bronze/Gold completions worked: those enrollments were submitted first.

### Issue 2 — Empty Equipment Maintenance tile

Not a thumbnail issue. The video for "Harvest and sell" renders correctly via the `<video src controls>` branch at line 583-584 — that path works for any browser-playable MP4/WebM. The empty grey tile on "Equipment Maintenance" is the **task placeholder** rendered when there is no `challenge_evidence` row for that task at all. The player simply hasn't uploaded evidence for that task yet.

The current UI is misleading: it draws an empty media frame for tasks with zero evidence, which looks identical to a broken thumbnail.

## Recommended Fixes (UI only — no business-logic changes)

1. **Surface enrollment state to the moderator**
   - When `enrollment.status !== "submitted"` and there are pending evidence items, render a clear inline notice on the enrollment card: *"Awaiting player submission — player must tap 'Submit for Review' before moderators can approve."*
   - Keep the current gating (don't allow approval of un-submitted work), but stop leaving the moderator guessing.

2. **Distinguish "no evidence yet" from "broken media"**
   - In the evidence list, group by task using `reviewTasks`. For each task with **zero** `challenge_evidence` rows, render a muted "No evidence uploaded yet" tile instead of the empty image-icon placeholder. The placeholder shown for Equipment Maintenance is actually coming from elsewhere — confirm by replacing the unconditional task tiles with an explicit "no evidence for this task" state.
   - Optional polish: for `file_type === "video"`, add `preload="metadata"` and a `poster` fallback so the first frame shows even before play. (Real thumbnail extraction would require a backend job — out of scope for this fix; native video preview is sufficient.)

3. **Optional admin override**
   - Add an admin-only "Force submit" action on enrolled-but-not-submitted enrollments so staff can move test/stuck players forward without asking them to click Submit.

## Immediate Unblock (no code change)

Have RacerX open `/challenges/<FS25-Bronze-id>`, upload evidence for **Equipment Maintenance**, then click **Submit for Review**. The enrollment will flip to `submitted` and the Approve / Reject controls (per-evidence and "Approve All & Complete") will appear in `/moderator/challenges → Evidence Review`. Approving then fires the same `sync-to-academy` dispatch you've been validating for ATS Bronze/Gold.

## Files that would change

- `src/pages/moderator/ModeratorChallenges.tsx` — add submission-state notice, render per-task "no evidence" placeholder, optional video `preload`/poster, optional admin force-submit button.

No DB migrations, no edge function changes, no impact on the Phase E/F webhook parity work.
