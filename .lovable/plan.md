# Hide Registration Counts from Tenant Roles

Goal: tenant roles (tenant admin, manager, marketing) see a tournament's player capacity but never how many players have registered. Registered counts stay with platform roles (Admin and Moderator).

## What is already correct

Verified in the current code and database:

- Tournament cards, the tournament detail page, and the details dialog already show `X max` to everyone except platform admins.
- The `tournament_registrations` table already restricts reads to the registrant, co-participants, the tournament creator, and platform Admin/Moderator. A tenant role with no other relationship cannot count rows through the API.
- The weekly registrations digest email is addressed only to `darcy@fgn.gg`, not to tenant admins — despite what the tenant guide claims.

## Gaps to close

1. **Moderators are locked out of counts they should see.** Tournament cards, the detail page, and the details dialog gate on `isAdmin` only. Per the decision, Moderator is a platform role and should see `registered / max`.
2. **The rule is copy-pasted in six places.** `TournamentCard`, `TournamentDetail`, `TournamentDetailsDialog`, `ModeratorTournaments` (three spots) each re-derive it, so the next screen will get it wrong again.
3. **Tournament creator loophole.** A tenant staff member who created a tournament can read all its registration rows through the creator policy. Capacity/full state must still work, but the count itself should not surface in tenant-facing UI.
4. **Guide text is wrong.** The tenant guide tells tenant admins they receive a weekly sign-up digest with names and counts. They do not. The claim must be removed so the documented rule matches the enforced one.

## Approach

**One shared rule.** Add `useCanSeeRegistrationCounts()` — true when the signed-in user is platform Admin or Moderator, false otherwise (including tenant admin, manager, marketing, and creators who are not platform staff). Every count display reads from this hook.

**Apply it everywhere counts render.**
- `TournamentCard` — replace `showRegCount = isAdmin`.
- `TournamentDetail` — Players stat.
- `TournamentDetailsDialog` — Players stat.
- `ModeratorTournaments` — table cell, mobile card, detail dialog (moderators now see counts here).
- `AdminTournaments` stays unconditional; the route is platform-admin only.

**Keep capacity logic intact.** `isFull` and the disabled Register button still compute from the count internally; only the rendered number is withheld. Non-platform users continue to see `16 max` and a "Full" state without a number.

**Tenant events are unaffected.** Tenant staff keep the attendee list and count for their own `tenant_events`, per the decision. No database policy changes.

**Documentation.** Remove the two weekly-digest claims from the tenant guide and state the rule explicitly: tenant roles see capacity, platform roles see registered counts.

**Tests.** Extend `src/test/data-shielding.test.tsx` with cases for moderator (count visible), tenant-role user (count hidden), and creator-who-is-not-platform-staff (count hidden).

## Technical notes

- New file `src/hooks/useCanSeeRegistrationCounts.ts`, reading `isAdmin` / `isModerator` / `roleLoading` from `AuthContext`. While roles are loading it returns `false`, so a count never flashes before the role resolves.
- No migration. `tournament_registrations` policies already match the intended read model; the change is presentation-layer only.
- Files touched: `src/hooks/useCanSeeRegistrationCounts.ts` (new), `src/components/tournaments/TournamentCard.tsx`, `src/components/tournaments/TournamentDetailsDialog.tsx`, `src/pages/TournamentDetail.tsx`, `src/pages/moderator/ModeratorTournaments.tsx`, `src/pages/tenant/TenantGuide.tsx`, `src/test/data-shielding.test.tsx`.
