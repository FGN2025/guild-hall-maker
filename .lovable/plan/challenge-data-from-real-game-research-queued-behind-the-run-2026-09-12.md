# Challenge data from real game research (queued behind the run reliability checkpoint)

## Order of work

The eight-step run reliability checkpoint runs first and finishes first. Nothing below
starts until the scratch fixtures are cleaned up and that checkpoint is reported closed.
This plan is the next effort, written now so it is ready when the lane is clear.

## What we have today

From the Sep 4 assessment: 119 challenges, 483 tasks across 11 games, 40 enrollments,
12 completions. Every task is verified by hand even though 391 real achievements are
already synced from Steam and 14 achievement definitions exist. Only 21 challenges carry
skill tags, and the Academy links on 10 of them all point at the same generic page.

So a player finishes a challenge and nothing about it argues that an Academy account is
worth creating. That is the actual problem this solves.

## What gets researched, and from where

Per game, in priority order:

- **Steam** — the real achievement list for each app id: internal api name, display name,
  description, rarity. This is the spine, because it is the only source that maps to
  something the platform can auto-verify against `steam_player_achievements`.
- **YouTube** — how the community actually describes the skill behind an achievement,
  used to write task wording a player recognises, and to attach one genuinely useful
  tutorial link per task where a good one exists.
- **Discord** — community conventions and difficulty consensus for games where Steam
  rarity is thin or absent. Weakest source, used last, never on its own.

Games with no Steam presence get YouTube and Discord only, and their tasks stay manual.
That is stated per game in the review sheet rather than hidden.

## Process

1. **Research pass, nothing written.** I gather per game and produce a review sheet you
   approve before any row moves: proposed tasks, the Steam achievement each one verifies
   against, a skill tag, a difficulty, and a specific Academy course link.
2. **Your review.** Line by line, per game. Reject, edit, or approve.
3. **Write only what you approved**, game by game rather than in one bulk import, so a
   bad game does not contaminate the rest.
4. **Catalogue cleanup** last: the assessment found challenges with no tasks and
   duplicated intent. Those are listed for your decision, not deleted by me.

## Where the Academy pull comes from

Three changes, all downstream of the research:

- A task that maps to a Steam achievement verifies itself for the six players with linked
  Steam profiles, instead of waiting on manual review.
- Each challenge carries a real skill tag rather than a blank, so a completion says what
  the player demonstrated.
- The Academy link on each challenge points at the specific course that continues that
  skill, replacing the one generic URL currently shared by ten challenges.

## Technical notes

- Research runs through web search and the Steam public achievement schema; no new
  connector is needed unless you want scheduled refresh, which is out of scope here.
- Writes touch `challenges`, `challenge_tasks`, and `achievement_definitions` only.
  No changes to points, enrollments, completions, or approval paths.
- Auto-verification reads existing `steam_player_achievements` rows. It awards a task,
  never a challenge completion outright, so the review path stays intact.
- Nothing here touches marketing, dispatch, approvals, or the kill switch.

## Open decisions for you

- Which games first. Eleven is too many for one review; I suggest the three with the most
  enrollments and a working Steam app id.
- Whether tasks that auto-verify should still appear in the review queue as a record, or
  complete silently.
