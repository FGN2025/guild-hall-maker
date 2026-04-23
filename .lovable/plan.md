

# Points Economy Assessment and Rubric Alignment Plan

## Current State Analysis (Using May as Baseline Month)

### 1. Active Content Inventory

| Category | Count | Total Points Available (if all completed by 1 player) |
|----------|-------|------------------------------------------------------|
| **Challenges** (monthly, active) | 36 | 423 pts |
| **Challenges** (one-time, active) | 37 | 588 pts |
| **Quests** (active) | 8 | 17 pts |
| **Tournaments** (typical month, ~20 events) | ~20 | 40-90 pts (participation only) |

### 2. Key Findings and Problems

**Problem A: Challenges are massively over-weighted vs. the Rubric**
- The rubric recommends 50 pts for an advanced/monthly challenge, yet most advanced/monthly challenges are set at only 10 pts. Some (like ATS Champion) are at 60 pts. There is no consistency.
- 73 active challenges can theoretically yield **1,011 points** for a single completionist player. Monthly challenges renew, so recurring players can earn 423+ pts/month from challenges alone.

**Problem B: Quests are effectively worthless**
- 8 active quests award only 1 pt each (except Super Smash Bros at 10). Total: 17 pts.
- The rubric recommends 5-50 pts per quest. Quests are drastically under-valued vs. challenges, making them pointless for players to pursue.

**Problem C: Tournaments award almost nothing**
- Most tournaments give 2 pts participation, 0 for placement. One has 5 pts participation.
- Rubric recommends 3-8 pts participation with 2x-5x placement multipliers. Placement points are not being assigned at all (all zeros).
- A player attending every tournament (~20/mo) earns ~44 pts -- a fraction of what one monthly challenge set gives.

**Problem D: Prize shop is not calibrated**
- Current prizes: Mousepad (10 pts), Sticker Pack (50 pts), Gaming Headset (500 pts).
- The `prizes` table has no `rarity` column, so the rubric's prize band validation (common 50-150, rare 200-400, epic 500-800, legendary 1000-5000) **cannot actually be enforced** -- there is no field to store it.
- A $50 gift card would need a points cost, but there is no real-dollar-to-points conversion defined anywhere.

**Problem E: No monthly budget cap mechanism**
- The $1,500/mo prize budget is not enforced or even tracked anywhere. There is no dashboard or alert for approaching the limit.
- With 1,205 registered users, even modest engagement could blow the budget if points are too easy to earn.

### 3. Points-to-Dollar Conversion Math

To control a $1,500/mo budget, we need a conversion rate. Working backwards:

| Prize | Real Cost | Suggested Points Cost |
|-------|-----------|----------------------|
| Sticker Pack | ~$5 | 50 pts |
| Mouse Pad | ~$15 | 150 pts |
| $50 Gift Card | $50 | 500 pts |
| Keyboard / Headset | ~$75 | 750 pts |
| $100 item (super-admin only) | $100 | 1,000 pts |

This implies **~10 pts = $1** conversion rate.

At $1,500/mo budget = 15,000 redeemable points across ALL players combined.

### 4. Monthly Earning Capacity Assessment (Per Player)

Using rubric-recommended values for a typical active player in May:

| Source | Realistic Monthly Earn | Notes |
|--------|----------------------|-------|
| Challenges (4 monthly, 2 one-time) | 80-120 pts | Across multiple games |
| Quests (2 completed) | 20-30 pts | If properly valued |
| Tournaments (8 attended, 1 win) | 40-65 pts | With placement points |
| **Total per active player** | **140-215 pts** | |

At 15,000 pts budget / 200 pts avg = **~75 active players** can fully participate before hitting the cap. With current engagement (very low), this is safe. As engagement grows, the rubric values may need to tighten.

---

## Recommended Plan

### Phase 1: Schema and Data Fixes (Database)
1. **Add `rarity` column to `prizes` table** -- text enum (common, rare, epic, legendary) so prize band validation actually works.
2. **Add `dollar_value` column to `prizes`** -- decimal, for budget tracking.
3. **Create a `monthly_prize_budget` row in `app_settings`** -- stores the $1,500 cap.
4. **Create a view `monthly_redemption_spend`** -- aggregates approved/fulfilled redemptions by month with dollar totals.

### Phase 2: Realign Active Content Points
1. **Run dry-run of `align-points-to-rubric`** to preview what would change across all 73 challenges, 8 quests, and 20 tournaments.
2. **Update Quest points** from 1 to rubric-recommended values (5-15 pts each).
3. **Add placement points to tournaments** -- currently all zeros. Apply rubric multipliers (first=5x, second=3x, third=2x of participation base).
4. **Normalize challenge points** that deviate from rubric (the 60-pt outlier, the 8-9 pt values that should be 10 or 20).

### Phase 3: Prize Shop Calibration
1. **Set prize costs** using the 10 pts = $1 baseline:
   - Common (stickers, patches): 50-150 pts
   - Rare (mousepad, shirt): 200-400 pts
   - Epic ($50 gift card, headset): 500-800 pts
   - Legendary ($100 item, super-admin only): 1,000 pts
2. **Assign rarity** to each prize for band enforcement.
3. **Add $100 maximum enforcement** -- the rubric UI should warn/block prizes over 1,000 pts unless super-admin override is provided.

### Phase 4: Budget Monitoring Dashboard
1. **Add a "Monthly Prize Budget" card** to Admin Dashboard showing:
   - Total approved redemption dollar value this month vs. $1,500 cap
   - Projected spend based on pending redemptions
   - Per-category point distribution (challenges vs. quests vs. tournaments)
2. **Add alert** when monthly spend reaches 80% of budget.
3. **Add per-game point distribution chart** so no single game dominates earning potential.

### Phase 5: Rubric Enforcement Tightening
1. **Change enforcement mode from "suggest" to "warn"** so admins see clear alerts when creating content that deviates from rubric.
2. **Add game-parity check** -- when creating a challenge for Game A, warn if Game A already has significantly more point-earning opportunities than other games.
3. **Add monthly points ceiling per player** as an optional rubric field (e.g., 300 pts/mo cap) to prevent runaway accumulation.

### Execution Order
- Phase 1 and 2 first (data foundation + realignment)
- Phase 3 next (prize calibration)
- Phase 4 and 5 in parallel (monitoring + governance)

### Out of Scope
- Automated monthly budget enforcement (auto-rejecting redemptions) -- keep manual for now
- Retroactive point adjustments for past seasons

