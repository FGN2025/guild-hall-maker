# Fix duplicate task order in challenge 98b37482

## What I found (read-only check)

- Only one challenge in the whole catalog has duplicate task order: `98b37482-0b38-4a05-9dc3-82ccb2d73224`. No other siblings, and no tasks with a blank order.
- It has 6 tasks, two per order value (0, 0, 1, 1, 2, 2). They come from two seeding batches on 2026-03-31 (02:51 and 20:51): a short version and a longer, reworded version of the same three steps.
- The contract does not permit duplicate order values. Studio's rule is correct; the fix is on our side.

## Fix (data only)

Renumber the six tasks to unique values, keeping each short/long pair together, earlier batch first:

| New order | Task |
| --- | --- |
| 1 | Four contracts spanning all major types |
| 2 | Complete four contracts spanning earthmoving, road, crane, and concrete |
| 3 | Crane and concrete pump sequence |
| 4 | Execute a crane lift followed by a concrete operation on the same structure |
| 5 | Zero failed inspections |
| 6 | Complete all four contracts with full payment -- no skipped phases |

Task ids, titles, descriptions and everything else stay unchanged. The update moves the catalog revision automatically, so Studio sees fresh data.

## Prevent a repeat

Add a database rule that each challenge's task order values must be unique, so a future seed or edit cannot reintroduce the problem (applied after the renumber, verified there are zero duplicates first).

## Verify

- Re-run the duplicate check: zero rows.
- Call `GET /challenges/98b37482...` on the Studio API and confirm tasks come back ordered 1 to 6.
- Then Studio re-runs its live read; B1 should flip to PASS.

## Open note for the owner

These look like the same three steps loaded twice. Removing the extra three would be a content change, so it is not part of this fix — say the word if you want that cleanup afterward.
