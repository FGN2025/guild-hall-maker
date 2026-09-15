# Merit Badge Pilot Scope — Update to the Approved Scouts Plan

This updates the approved FGN merit pathways and Scouts advancement plan with the six named pilot merit badges. Everything else in the approved plan stands unchanged: the official reference documents are already folded in, no official badge is ever awarded by gameplay alone, and no catalog change happens before a review sheet is approved.

## Named pilot badges

| Merit badge | FGN pilot area | Games used for evidence |
| --- | --- | --- |
| Aviation | Flight | Microsoft Flight Simulator 2024 |
| Truck Transportation | Transportation | American Truck Simulator |
| Automotive Maintenance | Transportation | Car Mechanic Simulator (confirm availability in catalog) |
| Electricity | Construction trades | Electrician Simulator |
| Home Repairs | Construction trades | House Flipper, House Flipper 2 |
| Safety | Cross-cutting | Applies across all pilot pathways |

Safety is treated as a cross-cutting badge: its requirements attach to the safety-related tasks inside the other five pathways rather than to a single game.

Agriculture and technology moves out of the first pilot wave and stays queued as a later pathway.

## Review sheet per badge

Before any catalog change, one review sheet per badge, delivered for approval:

- every official requirement, numbered, with its exact 2025 wording and source link;
- requirement version and effective year recorded with the row;
- the FGN challenge and task proposed against each requirement;
- mapping strength: practice, supporting evidence, or potentially satisfies;
- verification source: Steam achievement, Steam playtime, uploaded evidence, or counselor-only;
- an explicit flag for any requirement using show, demonstrate, discuss, visit, or make — these can never be closed by a game signal alone;
- safety, supervision, facility, or certification conditions;
- a suggested learning resource and FGN Academy next step;
- keep, rewrite, merge, deactivate, or create recommendation for the challenge.

## Sequence

1. Build the six review sheets from the official requirements and the current catalog. No writes.
2. On approval, land the data foundation: pathways, merits, versioned requirements, mappings, counselor records, decisions, partials, audit history, tenant isolation.
3. Ship the redesigned player pathway hub and challenge detail for the universal FGN merit layer.
4. Ship the Scouts tenant layer: branding, counselor review queues, partials, blue-card-equivalent record, award status.
5. Pilot in this order: Aviation, Truck Transportation, Electricity, Home Repairs, Automotive Maintenance, with Safety enabled alongside the first pathway.

## Guardrails carried forward

- Counselor sign-off required for every official requirement; registration, badge approval, training currency, and annual status all checked before a signature is accepted.
- Partials retained through age 18 with their original counselor, date, and requirement version.
- Digital completion, badge eligible, recorded with Scouts, and physical badge issued remain separate states.
- Youth protection: no unrecorded one-to-one adult and youth contact anywhere in the workflow.
- No changes to marketing automation, scheduled posting, approvals, dispatch, or the kill switch.

## Technical notes

New tables land with explicit grants, RLS, and tenant scoping; counselor authority lives in a dedicated assignment table, never on profiles. Requirements are stored versioned and immutable; mappings reference a requirement version, not a badge alone. Existing `challenges`, `challenge_tasks`, `challenge_evidence`, enrollments, completions, and points behavior are extended, not replaced. Automotive Maintenance depends on a mechanic-simulator title being present in `games`; if none exists, that badge's sheet will propose the game addition before mapping.
