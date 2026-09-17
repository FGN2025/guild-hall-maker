# Move Merit Pathways off fgn.gg to merits.fgn.academy

fgn.gg stays focused on gameplay and entertainment. All merit and badge content moves to the Merits site, which becomes the owner of merit records. Play keeps the challenges themselves and keeps feeding them to Merits.

## What changes on fgn.gg

1. **Merit Pathways pages go away.** The "Merit Pathways" sidebar entry, the pathways list page, and the individual merit page are removed.
2. **Old links redirect.** Anyone opening `/pathways` or `/pathways/<merit>` is sent to `https://merits.fgn.academy`, carrying the merit name through so the Merits site can land them in the right place.
3. **Game pages keep a soft mention.** The badge panel on a game's challenge page no longer names a specific pathway or shows merit progress. Instead it shows plain challenge progress plus one line: these challenges can count toward merits, with an outbound link to merits.fgn.academy. The pathway chip on the game tiles is dropped.
4. **No merit lookups from the site.** The hook that joins challenges to merit pathways stops querying merit tables, so the gameplay pages no longer depend on merit data at all.

## Handing the merit data to Merits

Merits becomes the system of record. Handover happens in two steps so nothing is lost:

1. **Export.** A one-off export of every merit record currently held here — pathways, merits, challenge mappings, official badges, versioned requirements, player progress, counselor registrations and assignments, and advancement records — written as a JSON file delivered to you for import into Merits.
2. **Retire here, after you confirm the import.** Only once Merits confirms it holds the data do the merit tables on Play get retired. Until then they stay untouched in the background, just unused by the site. Retiring is a separate, explicitly approved step — this plan does not delete anything.

The link between the two systems stays exactly as it is today: Play continues to publish `challenge.created`, `challenge.updated`, and `challenge.deactivated` to Merits, and the merit connector endpoint stays live so Merits can write completions back and keep the Skill Passport in sync.

## Not in this plan

- Per-community renaming (Home Repairs vs Home Renovation, counselor vs coach) — that belongs to the Merits project.
- Any change to challenges, points, tournaments, or the Competitive Gaming section.
- Deleting merit tables or data on Play.

## Technical notes

- Remove `src/pages/Pathways.tsx`, `src/pages/MeritDetail.tsx`, `src/components/merits/*`, `src/hooks/useMeritPathways.ts`, and the `Medal` nav item in `AppSidebar.tsx`.
- In `App.tsx`, replace the two `/pathways` routes with a small redirect component that does `window.location.replace` to `https://merits.fgn.academy` (append `/pathways/:slug` when a slug is present).
- In `useChallengeHub.ts`, drop the `challenge-pathway-map` query and the `pathway` field from the game entry type; update `GameTile.tsx` and `GameChallenges.tsx` accordingly.
- `GameBadgePanel.tsx` loses the `pathway` prop and gains a static merits mention with an external link.
- Export script runs read-only SQL over `merit_pathways`, `merits`, `merit_challenges`, `official_badges`, `badge_requirements`, `player_merit_progress`, `counselor_registrations`, `counselor_badge_assignments`, `advancement_records`; output saved to Files.
- `merit-connector-api`, `ecosystem-webhook-dispatch`, the `challenges_merit_webhook` trigger, and `merit_connector_deliveries` are untouched.
