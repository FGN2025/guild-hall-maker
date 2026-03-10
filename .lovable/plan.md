

## Allow Admins & Moderators to Edit Tasks on Published Challenges

### Issues Identified

1. **ChallengeDetail page** only checks `isAdmin` for showing Edit/Delete buttons — **Moderators are excluded**.
2. **EditChallengeDialog** has no task management (add/edit/delete tasks). Tasks can only be added during creation via `CreateChallengeDialog`.
3. There is no way to manage tasks on an existing challenge from any UI.

### Changes

| File | Change |
|------|--------|
| `src/pages/ChallengeDetail.tsx` | Import `isModerator` from `useAuth`. Change `isAdmin` guard to `isAdmin \|\| isModerator` for Edit/Delete buttons and the edit/delete dialogs. |
| `src/components/challenges/EditChallengeDialog.tsx` | Add a full task management section: fetch existing `challenge_tasks`, allow adding new tasks, editing existing task titles/descriptions, removing tasks, and reordering. On save, sync tasks (delete removed, update existing, insert new). |

### Detail

**ChallengeDetail.tsx** — line 42 and guards at lines 138, 347:
```typescript
const { user, isAdmin, isModerator } = useAuth();
// ...
{(isAdmin || isModerator) && ( /* Edit + Delete buttons */ )}
// ...
{(isAdmin || isModerator) && challenge && ( /* EditChallengeDialog + AlertDialog */ )}
```

**EditChallengeDialog.tsx** — Add task management:
- Fetch existing tasks via `useQuery` on `challenge_tasks` filtered by `challenge.id`
- Local state: `tasks` array with `{ id?: string, title, description, display_order, _isNew?, _deleted? }`
- UI section with "Tasks" header, list of editable task rows (title input + description input + remove button), and an "Add Task" button
- On save mutation, after updating challenge fields:
  1. Delete tasks marked as removed: `supabase.from("challenge_tasks").delete().in("id", removedIds)`
  2. Update existing tasks: loop and `.update()` each
  3. Insert new tasks: `.insert()` batch
- Invalidate `challenge-tasks` query key alongside the existing invalidation

