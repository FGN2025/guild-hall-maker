

## Add Unenroll Function to Challenges

### Changes

**1. `src/hooks/useChallengeEnrollment.ts`** — Add an `unenroll` mutation:
- Delete the enrollment row from `challenge_enrollments` where `id = enrollment.id`
- Also delete all associated `challenge_evidence` rows for that enrollment first (cascade may handle this, but explicit is safer)
- Invalidate `challenge-enrollment` and `challenge-evidence` queries on success
- Export `unenroll` and `unenrolling` from the hook

**2. `src/pages/ChallengeDetail.tsx`** — Add unenroll button + confirmation dialog:
- Destructure `unenroll` and `unenrolling` from the hook
- Show an "Unenroll" button in the sidebar when the user is enrolled but NOT completed/submitted (i.e. status is `enrolled`, `in_progress`, or `rejected`)
- Wrap in a confirmation `AlertDialog` warning that evidence will be lost
- On confirm, call `unenroll()` and navigate stays on the page (enrollment clears, enroll button reappears)

### Unenroll eligibility
Users can unenroll when status is `enrolled`, `in_progress`, or `rejected`. Users who have `submitted` or `completed` cannot unenroll — their work is already under/past review.

### Files changed

| File | Change |
|------|--------|
| `src/hooks/useChallengeEnrollment.ts` | Add `unenrollMutation` that deletes evidence then enrollment row |
| `src/pages/ChallengeDetail.tsx` | Add unenroll button with confirmation dialog in sidebar |

