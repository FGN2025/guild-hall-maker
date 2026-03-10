

## Update All Guides with Recent Features

Based on code review, here are the specific content gaps across all four guides and what needs to be added/updated.

### Changes by File

**1. `src/pages/admin/AdminGuide.tsx`** — Challenges section (line ~408-425):
- Change "type (one-time or repeatable)" to "type (Daily, Weekly, Monthly, or One-Time)"
- Add bullet: "Post-Publication Task Editing — Admins and Moderators can add, edit, reorder, and remove tasks on published challenges directly from the Edit dialog on the challenge detail page."
- Add bullet about challenge approval notifications: "Approval Notifications — When a challenge submission is approved, the player automatically receives an in-app notification with the challenge name and points earned."

**2. `src/pages/moderator/ModeratorGuide.tsx`** — Challenges section (line ~100-125):
- Change "type (one-time or repeatable)" to "type (Daily, Weekly, Monthly, or One-Time)"
- Add bullet: "Post-Publication Task Editing — Admins and Moderators can add, edit, reorder, and remove tasks on existing challenges via the Edit dialog accessible from the challenge detail page."
- Add bullet: "Approval Notifications — When you approve a challenge submission, the player automatically receives an in-app notification confirming approval and the points earned."
- Add bullet in Notifications section: "Challenge Approved — When a moderator approves a challenge enrollment, the player receives a notification with the challenge name and points awarded."

**3. `src/pages/PlayerGuide.tsx`** — Challenges section (line ~202-228):
- Change "Types — Daily, Weekly, and One-Time" to "Types — Daily, Weekly, Monthly, and One-Time"
- Add bullet: "Approval Notification — When a moderator approves your challenge submission, you'll receive an instant notification confirming approval and the points you earned."

**4. `src/pages/tenant/TenantGuide.tsx`** — No challenge-related content; no changes needed.

### Summary of Updates

| Feature | Admin Guide | Mod Guide | Player Guide | Tenant Guide |
|---------|------------|-----------|--------------|--------------|
| Monthly challenge type | Update | Update | Update | N/A |
| Post-pub task editing | Add | Add | N/A | N/A |
| Approval notifications | Add | Add | Add | N/A |

All changes are bullet text updates within existing `sectionData` arrays — no structural or UI changes needed.

