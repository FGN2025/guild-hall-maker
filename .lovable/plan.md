# Make the Partner Access card visible on play.fgn.gg

## Why you don't see it
1. The card sits **above** the Connection Test section, not below it as I told you. Your screenshot shows the area below it.
2. You're on the live site (play.fgn.gg). The card was added after the last publish, so the live site may not have it yet. It is in the preview.

## Steps
1. **Publish** so the live site gets the card. This changes no player-facing pages.
2. Move the card to the top of the Ecosystem page, with a clear "Partner Access (Studio read API)" heading, so you can find it right away.
3. Check it in the preview: the card shows up for platform admins and has the Issue button.

## Technical details
- In `src/pages/admin/AdminEcosystem.tsx`, move `<PartnerAccessManager />` (now on line 428, above `EcosystemConnectionTest`) to be the first section.
- No backend, access-rule or key-handling changes.
