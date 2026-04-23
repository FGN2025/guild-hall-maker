---
name: Points Economy & Budget Controls
description: Conversion rate (10pts=$1), $1,500/mo prize budget cap, prize rarity/dollar_value columns, monthly_redemption_spend view, enforcement mode "warn"
type: feature
---
- Conversion rate: 10 points = $1 real value
- Monthly prize budget: $1,500 (stored in app_settings key 'monthly_prize_budget')
- Prize bands: common 50-150pts, rare 200-400pts, epic 500-800pts, legendary 1000-5000pts
- Prizes table has `rarity` and `dollar_value` columns for band validation and budget tracking
- `monthly_redemption_spend` view aggregates approved/fulfilled redemptions by month with dollar totals
- Rubric enforcement mode: "warn" (v2) — alerts admins when deviating from recommended values
- `monthly_player_cap` field (optional, default 300) limits per-player monthly earning
- PrizeBudgetCard on Admin Dashboard shows spend vs. cap with 80% warning threshold
- Realignment batch 02e27160 applied 83 changes across challenges, quests, tournaments on 2026-04-23
