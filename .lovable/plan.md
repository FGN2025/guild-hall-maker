

## Confirm: Display Name Hidden Only for Invite Signups

The proposed plan checks `isInviteFlow` (which is `true` only when the URL has `?invite=true&email=...`). Here's a summary of what stays the same vs. what changes:

| Scenario | Display Name field | ZIP check step |
|---|---|---|
| Normal player signup | **Shown, required** (no change) | **Shown** (no change) |
| Invite signup (`?invite=true`) | **Hidden, optional** | **Skipped** (already skipped today) |
| Login | Not shown (no change) | N/A |

Only one file changes: `src/pages/Auth.tsx`. Three small edits:
1. Wrap the Display Name block in `{!isInviteFlow && (...)}`.
2. Skip the "Display Name is required" validation when `isInviteFlow`.
3. Disable the uniqueness-check hook for invite flows.

Everything else — ZIP verification, subscriber validation, password strength, terms checkbox — remains identical.

