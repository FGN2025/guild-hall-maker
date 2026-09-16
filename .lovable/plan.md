# Widen the challenge generator beyond trucking

Today "Generate with Agent" only produces American Truck Simulator / CDL challenges: the domain list, the title prefix, the knowledge source and the game are all hard-wired to trucking. This turns it into a multi-trade generator.

## Trade areas covered

| Trade area | Game(s) | Knowledge notebook |
|---|---|---|
| Transportation (existing) | American Truck Simulator | connected |
| Construction & home repair | Construction Simulator, House Flipper, House Flipper 2 | Construction Sim only |
| Aviation | Microsoft Flight Simulator 2024 | none |
| Electrical | Electrician Simulator | none |
| Agriculture & heavy equipment | Farm Simulator 2025, Roadcraft | both connected (Farm, Roadcraft) |

## How it works for the admin

1. Pick a **trade area**, then a **game** within it.
2. Pick a **domain** (e.g. "Pre-flight inspection", "Rough-in wiring", "Fall protection"), which pre-fills its standard reference, difficulty, points and time — exactly like today's CDL domains.
3. The generator writes the challenge, tasks, coach notes and cover-art prompt, runs the same 18-point quality check, and shows the same editable review screen before publishing.
4. Each generated challenge is labelled with the source used: the game's knowledge notebook, or the built-in AI when no notebook is connected or the notebook has no usable material. The review screen shows this so the reviewer knows what to fact-check.

Titles use a per-area prefix: `ATS Skills:` (unchanged), `Aviation Skills:`, `Construction Skills:`, `Electrical Skills:`, `Agriculture Skills:`. Existing challenges are untouched.

## Knowledge sourcing

- If the selected game has an active notebook, query it first (as today).
- If there is no notebook, or the notebook returns nothing usable / no JSON, fall back to Lovable AI to draft the challenge against the named standard, and mark the result `source: "ai"` with a visible warning banner on the review screen.
- Regulatory/standards references are entered or pre-filled per domain (FAA 14 CFR for aviation, OSHA 29 CFR / NEC for construction and electrical, OSHA/ASABE for agriculture) and carried through to the published challenge.

## Technical notes

- Rename the concept, keep the route: `src/lib/cdlDomainMaps.ts` becomes a trade-domain catalogue — `TRADE_AREAS` (area → games, title prefix, reference-type defaults) plus a domain map per area, with the existing CDL entries moved under Transportation unchanged. Existing exports (`CDL_DOMAINS`, `ATS_GAME_ID`, `computePointsBreakdown`, `buildCoverImagePrompt`) stay exported so nothing else breaks.
- `src/pages/moderator/ModeratorCDLGenerate.tsx`: add trade-area and game selects driving the domain list; use the area's prefix and `game_id`; show the knowledge-source badge/warning. Page heading becomes "Generate Trade Skills Challenge".
- `supabase/functions/generate-cdl-challenge/index.ts`: accept `trade_area`, `game_id`, `title_prefix`, `standard_reference`; look up `admin_notebook_connections` by the submitted `game_id` instead of the ATS default; on missing notebook or unusable response, call Lovable AI (`openai/gpt-6-astra`, streamed and consumed server-side) with the same JSON contract; return `source: "notebook" | "ai"`. Validation check #2 compares against the submitted prefix rather than the literal `ATS Skills:`.
- `supabase/functions/publish-cdl-challenge/index.ts`: persist the area and standard reference into the existing `cdl_domain` / `cfr_reference` columns (kept as the generic domain/reference fields — no schema change), plus the submitted `game_id`.
- No database migration, no change to existing challenges, publishing still inserts inactive pending a cover image.

## Verification

Generate one challenge per trade area — one notebook-backed (Farm Simulator) and one AI-fallback (Electrician Simulator) — confirm the 18-point check passes, the title prefix is right, the game is correct, and publishing lands the challenge inactive with its tasks.
