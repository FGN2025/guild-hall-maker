

# Improve Evidence Gallery: Inline Video + Delete

## Changes

### 1. Database: Add DELETE RLS policy for `challenge_evidence`
Currently players cannot delete evidence (no DELETE policy for own records). Add a policy allowing users to delete their own evidence only when their enrollment status is not yet `submitted` or `completed`.

**Migration SQL:**
```sql
CREATE POLICY "Users can delete own evidence before submission"
ON public.challenge_evidence
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_enrollments ce
    WHERE ce.id = challenge_evidence.enrollment_id
      AND ce.user_id = auth.uid()
      AND ce.status IN ('enrolled', 'in_progress', 'rejected')
  )
);
```

### 2. Hook: Add `deleteEvidence` mutation to `useChallengeEnrollment.ts`
Add a new mutation that deletes a row from `challenge_evidence` by ID, invalidates the evidence query, and shows a toast.

### 3. UI: Update evidence gallery in `ChallengeDetail.tsx`
- **Video playback**: Render a `<video>` tag with `controls` for `file_type === "video"` instead of the placeholder icon.
- **Delete button**: Show a small trash icon button on each evidence card when `canUpload` is true (i.e. enrollment is in an editable state). Clicking it calls `deleteEvidence`.
- Pass `deleteEvidence` and `canUpload` down or handle inline since the gallery is already rendered directly in this file.

### Files affected
| File | Change |
|------|--------|
| New migration | DELETE RLS policy on `challenge_evidence` |
| `src/hooks/useChallengeEnrollment.ts` | Add `deleteEvidence` mutation |
| `src/pages/ChallengeDetail.tsx` | Inline video tag, delete button on evidence cards |

