

## Add "Monthly" Challenge Type

### Change

**`src/components/challenges/CreateChallengeDialog.tsx`**: Add a `monthly` option to the Type `<Select>` dropdown, after "Weekly".

**`src/components/challenges/EditChallengeDialog.tsx`**: Add the same `monthly` option to the Type select in the edit dialog.

No database migration needed — the `challenge_type` column is a text field, not an enum.

