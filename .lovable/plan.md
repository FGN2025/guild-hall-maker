# Phase 3A — Transportation / American Truck Simulator canonicalization proposal

Read-only inventory. Nothing has been created, changed or mapped. 18 ATS challenges, all active.

## A. Complete ATS challenge inventory

### A1. CDL / Skills challenges (task-structured, simulation candidates)

| Challenge | ID | Diff | Type | CDL domain / CFR | Tag | Current activity |
|---|---|---|---|---|---|---|
| ATS Skills: Pre-Trip Inspection | e0f78129-9e60-40ed-a803-a31150f9f40c | beginner | one_time | Pre-trip vehicle inspection / 383.113(a) | cdl:pre-trip | none |
| ATS Skills: Precision Backing and Dock | f969023f-d69e-4323-a508-778c6a92e7fa | intermediate | one_time | Backing and parking / 383.113(b)(4)(5) | cdl:backing | **Trailer Positioning and Dock Approach** (b6e90c9b) — classification `simulation` |
| ATS Skills: Coupling and Uncoupling | b9231608-c3c7-4686-8e96-b926e5f52a90 | intermediate | one_time | Coupling and uncoupling / Part 380 App A | cdl:coupling | none |
| ATS Skills: Cargo Load Awareness | 2a6a3ce1-a71d-461d-86fa-e9d6d875911a | beginner | monthly | Cargo and weight / 383.111(a), 392-393 | cdl:cargo-securement | none |
| ATS Skills: Gear and Transmission Control | 063457fa-831b-4606-a888-2d6b5e91bf03 | intermediate | monthly | Shifting / Part 380 App A | cdl:shifting | none |
| ATS Skills: Speed Management | 40733510-e2be-40f5-8728-13c57cfcb135 | beginner | monthly | Speed management / 383.113(c) | cdl:speed-management | none |
| ATS Skills: Hazard and Emergency Response | bb03cf2a-073c-4237-87aa-c81e6abb8fb3 | intermediate | monthly | Hazard/emergency response / Part 392 | cdl:hazard-perception | none |
| ATS CDL: Adverse Weather Operations — Ice and Snow | ceb251d1-6b4a-44b5-a8c1-918f50b5e913 | intermediate | monthly | Adverse weather / CDL Manual Ch.2 | cdl:hazard-perception | none |
| ATS CDL: Mountain Grade and Runaway Truck Ramp Awareness | e2b404fe-3f30-4e85-8f02-b802d80f6acf | intermediate | monthly | Mountain driving / CDL Manual Ch.6 | cdl:speed-management | none |
| ATS CDL: Hours of Service and Logbook Management | b058c75b-0b52-4241-8101-a6f0060d2cee | intermediate | one_time | HOS / Part 395 | cdl:logbook | none |
| ATS CDL: Hazmat Placarding and Endorsement Awareness | b8b3d0dc-4203-4bd6-aa28-38c876d2fd80 | intermediate | one_time | Hazmat / Part 172 | cdl:hazmat-awareness | none |

Tasks (IDs preserved, nothing renamed):
- Pre-Trip: front of cab `1dcd0d03`; driver side + tyres `e787f20d`; rear + coupling area `62ae0875`; passenger circuit + sign-off `7f278989`
- Precision Backing: straight-line `b459831a`; offset `670df6d2`; alley dock `58a5e0a3`; mirror discipline `897f6b5d`; setup quality `815fb3f2`
- Coupling: approach alignment `7fa36879`; fifth-wheel engagement + pull test `08fce983`; delivery with coupled trailer `49935bcb`; clean uncoupling `27bab8d3`
- Cargo Load: confirm cargo/weight `85ebaae7`; cargo protection via smooth operation `4a01ee7f`; check habit loop `b5955cba`; weight and terrain control `a35db621`
- Gear/Transmission: progressive upshift `696cb398`; downshift before hill `ea950def`; gear before curve `c12f84b2`; downgrade gear selection `46fe7ade`
- Speed Management: traffic-flow match `cb8d8c71`; curve approach `9bc2f4f6`; intersection approach `a2bed150`; stopping-distance awareness `3c4ca8d7`
- Hazard/Emergency: fog and storm speed discipline `6b1b4d45`; space management `7d451647`; respond to road event `e5945dfe`; incident procedure `e02ad339`
- Adverse Weather: weather setup + speed plan `37b89695`; extended following distance `dae460aa`; smooth braking reduced traction `fdf46440`; knowledge annotation `e46ea71b`
- Mountain Grade: pre-grade speed selection `8004c7ae`; controlled descent with engine brake `63c18a05`; runaway ramp identification `ff70c4ee`; brake management annotation `255a4311`
- HOS: pre-run planning `a4f3a074`; delivery within HOS limits `9c1e8499`; 30-minute break documentation `d242a63f`; end-of-run log entry `f5d871e0`
- Hazmat: cargo ID + hazard class `ca2c9b7b`; placard placement `5e826cf8`; shipping papers / BoL `bdf08c71`; emergency first 15 minutes `bbaefd78`

### A2. Progression / rarity ladder (metric-counter challenges)

All monthly, no CDL domain, no skill tags, tasks are delivery counters and mileage thresholds.

| Challenge | ID | Diff | Pts | Tasks |
|---|---|---|---|---|
| ATS - Bronze Challenge | faddf23a-3650-4340-b371-2e3235b432d5 | beginner | 20 | 5 excellent / 5 on-time / 5 undamaged / 500-mile delivery |
| ATS - Silver Challenge - Uncommon | a824436e-10f5-4993-9d2b-71f0b24c82bf | beginner | 20 | 10 × three quality counters / 750-mile delivery |
| ATS - Gold Challenge - Uncommon | 558f290c-ea41-4e2f-8fb6-1c3c1c36e341 | intermediate | 35 | 20 × three counters / 1250-mile delivery |
| ATS - Platinum Challenge - Legendary | 76940d55-3c97-4f80-87d3-d7c184df62ba | intermediate | 35 | 25 × three counters / 2000-mile delivery |
| ATS - Podium Challenge - Epic | 02981f81-358e-4a5c-af0d-11e98dc91820 | advanced | 50 | 25 × three counters / 30,000 miles on duty / 2500-mile delivery |
| ATS - Champion Challenge - Legendary | ac1cb8c7-aec5-44e8-942b-f13ffb307b4d | advanced | 50 | 25 × three counters / 30,000 miles on duty / 2500-mile delivery |
| American Truck Simulator (weekly) | e20536e2-d535-4848-88d4-4351b4dc8ce9 | beginner | 1 | 3 short deliveries / 3 states / 1000 miles fine-free / $100k income / coast-to-coast |

## B. Proposed challenge → activity groupings

| Challenge | Proposed activity | New? | Variant of | Reason | Confidence |
|---|---|---|---|---|---|
| Precision Backing and Dock | Trailer Positioning and Dock Approach (existing) | no | — | keep approved golden path untouched | high |
| Pre-Trip Inspection | Commercial Vehicle Pre-Trip Inspection | yes | — | four-quadrant walkaround of tractor-trailer | high |
| Coupling and Uncoupling | Tractor-Trailer Coupling and Uncoupling | yes | — | fifth-wheel engagement + pull test; materially distinct from backing despite shared approach task | high |
| Cargo Load Awareness | Cargo and Weight Verification | yes | — | pre-departure load/weight confirmation and load-protective driving | medium (task 4 drifts into grade/curve control) |
| Gear and Transmission Control | Manual Transmission and Gear Selection | yes | — | shifting technique only | high |
| Speed Management | Speed and Space Management on Public Roads | yes | — | speed/space discipline across traffic, curves, intersections | high |
| Hazard and Emergency Response | Hazard Recognition and Emergency Response | yes | — | reacting to events and protecting the scene | medium (task 1–2 overlap with speed/space) |
| Adverse Weather — Ice and Snow | Adverse-Condition Driving Operations | yes | — | reduced-traction operation is a distinct simulated condition | medium (candidate to fold into speed/space) |
| Mountain Grade and Runaway Ramp | Grade Descent and Brake Management | yes | — | engine braking and descent control; distinct action | high |
| Hours of Service and Logbook | Hours-of-Service Planning and Logging | yes | — | planning/documentation around a run, not vehicle control | medium (largely annotation, not simulated action) |
| Hazmat Placarding | — (see D) | no | — | almost entirely knowledge annotation | low |
| Bronze / Silver / Gold / Platinum / Podium / Champion | Long-Haul Freight Delivery Operations | yes | Bronze is the base; the other five are difficulty variants | identical task shape, only thresholds change — one activity, six challenges | high |
| American Truck Simulator (weekly) | Long-Haul Freight Delivery Operations | no | variant of the ladder | same delivery-mileage metrics with an income goal | medium |

## C. Proposed canonical activity inventory

Game: American Truck Simulator, version unset. Domain `transportation` throughout.

1. **Trailer Positioning and Dock Approach** — existing, unchanged. Category `vehicle_operation`. 1 challenge.
2. **Commercial Vehicle Pre-Trip Inspection** — systematic exterior and under-hood inspection of a tractor-trailer before departure, identifying defects by quadrant. Category `inspection`. 1 challenge, 4 tasks.
3. **Tractor-Trailer Coupling and Uncoupling** — align and back under a trailer, engage and verify the fifth wheel, operate coupled, then drop the trailer safely. Category `vehicle_operation`. 1 challenge, 4 tasks.
4. **Cargo and Weight Verification** — confirm cargo type and weight before departure and operate to protect the load. Category `cargo_handling`. 1 challenge, 4 tasks.
5. **Manual Transmission and Gear Selection** — select and change gears appropriately for acceleration, grade and curve. Category `vehicle_operation`. 1 challenge, 4 tasks.
6. **Speed and Space Management on Public Roads** — maintain legal, steady speed and adequate following/stopping space in traffic, curves and intersections. Category `vehicle_operation`. 1 challenge, 4 tasks.
7. **Hazard Recognition and Emergency Response** — detect developing road hazards, respond to unplanned events and protect an incident scene. Category `safety`. 1 challenge, 4 tasks.
8. **Adverse-Condition Driving Operations** — operate on reduced-traction surfaces with adjusted speed, following distance and braking. Category `vehicle_operation`. 1 challenge, 4 tasks.
9. **Grade Descent and Brake Management** — select pre-grade speed and gear, descend using engine braking, and recognise escape ramps. Category `vehicle_operation`. 1 challenge, 4 tasks.
10. **Hours-of-Service Planning and Logging** — plan a run inside HOS limits, take required breaks and produce a compliant driver log. Category `compliance`. 1 challenge, 4 tasks.
11. **Long-Haul Freight Delivery Operations** — accept, haul and deliver freight over long distances on time and undamaged. Category `logistics`. **7 challenges** (Bronze, Silver, Gold, Platinum, Podium, Champion, weekly ATS) — the one-activity-many-challenges case.

Total: 1 existing + 10 proposed new.

## D. Recommended entertainment-only

- **ATS - Podium** and **ATS - Champion** are byte-identical in task shape; if the ladder is treated as competitive framing rather than skill evidence, the whole rarity ladder could be classified `entertainment_only` instead of mapping to activity 11. Recommendation: map them to activity 11 but mark the rarity ladder `simulation` only if Academy wants delivery-outcome evidence; otherwise entertainment-only. **Needs your decision.**
- **ATS CDL: Hazmat Placarding and Endorsement Awareness** — three of four tasks are written knowledge annotations with no simulated action (ATS has no hazmat placarding mechanic). Recommend `entertainment_only`, or defer until a real simulated hazmat activity exists.

## E. Ambiguous mappings needing approval

1. Adverse Weather vs Speed and Space Management — distinct activity or a condition modifier on one activity?
2. Hazard/Emergency vs Speed and Space — tasks 1–2 of Hazard duplicate speed/space behaviour.
3. Cargo Load Awareness task 4 (grades and curves) belongs to speed/gear activities.
4. HOS is planning and documentation, not a simulated physical action — accept as an activity or treat as compliance-only?
5. Coupling task 1 ("straight back under the trailer") overlaps the existing backing activity; proposed as a task-level link later, not a merge.

## F. Duplicate / variant findings

- Podium and Champion: identical task sets, different rarity and name only.
- Bronze→Champion: single progression family, threshold-scaled.
- Weekly "American Truck Simulator" challenge duplicates the ladder's metrics at a lower tier.
- No duplicate canonical activities would be minted for any of the above.

## G. Existing Academy relationships discovered

- Only one ATS challenge carries a canonical identity today: Precision Backing and Dock → `b6e90c9b-0c62-4232-ab04-a92064af191b`.
- No ATS challenge has `academy_next_step_url` set; Academy holds the Work Order mapping on its side, keyed by `simulation_activity_id`.
- Ten ATS challenges carry CDL domain + CFR references and `cdl:*` skill tags — usable as grouping evidence, not as Academy authoring.

## H. Recommended canonicalization order

1. Pre-Trip Inspection (cleanest, highest Academy value)
2. Coupling and Uncoupling
3. Grade Descent and Brake Management
4. Manual Transmission and Gear Selection
5. Speed and Space Management
6. Cargo and Weight Verification
7. Hazard Recognition and Emergency Response
8. Adverse-Condition Driving Operations (after decision E1/E2)
9. Hours-of-Service Planning and Logging (after decision E4)
10. Long-Haul Freight Delivery Operations + its 7 challenge links (after decision D1)
11. Hazmat — classify only, no activity

## On approval

Seed the approved activities, create the primary link rows (the link table stays authoritative, the challenge pointer stays derived), set `content_classification` on the ATS catalog, and let the existing ecosystem API and webhooks publish the new IDs. No player-facing change, no renames, no task ID changes.
