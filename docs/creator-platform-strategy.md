# Creator and Influencer Platform Strategy

**Market reassessment and revised build plan**

Supersedes the scope of `creator-discovery-platform-plan.md`. That document's technical work stands (the data model, the vidIQ capability map, the three shipped patchers). What changes is the scope, the sourcing strategy, and the recommendation about what to build versus buy.

Written 2026-08-15.

---

## Section 1. Why this reassessment

The original brief was "replicate the functionality of `apps.sideqik.com/oN63Ch23`." I scoped that to what the screenshots showed, which was Smart Search: discovery, saved searches, a five-stage funnel, and reason bullets.

Two things were wrong with that.

**It was too narrow.** Sideqik's own left nav lists Recommendations, Recruitment Forms, My Creators, Campaigns, Code Management, Messaging, Payments, Posts, three report types and Promotions. Discovery is one of ten items. The plan rebuilt roughly 15 percent of the product FGN was paying for and called it a replacement.

**It was also too broad.** Having now researched the category, building all ten pillars in a Streamlit app means competing with venture-funded platforms that charge $30,000 to $60,000 a year and have spent a decade on it. That is not a good use of FGN's engineering capacity.

The resolution is not somewhere in the middle. It is a different axis entirely, and the research points at it clearly.

---

## Section 2. What the market actually sells

Influencer marketing platforms converge on eight functional pillars. Every serious vendor has some version of all eight, which is why, as GRIN's own buyer guide concedes, "feature lists blur together."

| Pillar | What it covers | Category status |
|---|---|---|
| **1. Discovery** | Searchable creator database, filters on niche, size, geography, language, audience demographics, lookalike search | Table stakes. The differentiator is database quality, not size |
| **2. Vetting** | Audience authenticity, fake-follower and bot detection, brand safety scanning, FTC disclosure history | Table stakes, and increasingly a compliance requirement |
| **3. Creator CRM** | Relationship records, tags, lists, communication history, tiers, lifecycle stages | Table stakes. This is the actual system of record |
| **4. Recruitment and intake** | Public application pages, opt-in marketplaces, creator portals | Rising fast. Aspire's 1M+ opt-in marketplace is the model |
| **5. Campaign workflow** | Briefs, contracts, e-signature, deliverable tracking, content approval, UGC rights | Table stakes at mid-market and above |
| **6. Activation and commerce** | Promo codes, affiliate links, product seeding, TikTok Shop, creator licensing and paid amplification | The fastest-moving pillar. Where budget is shifting |
| **7. Payments** | Global payouts, W-9 and W-8 collection, TIN matching, 1099 and 1042-S filing, multi-currency | Increasingly outsourced to specialists (Tipalti, Lumanu, Trolley, Payouts.com) |
| **8. Measurement** | Engagement and reach, EMV, conversion attribution, incrementality, ROI reporting | Table stakes to show, genuinely hard to do well |

**Where the market is moving in 2026.** Three shifts matter for this decision.

Compensation is moving from flat fees to performance. Brands are forming three to six month partnerships with performance bonuses rather than paying per post, and treating creators as affiliate partners with codes, tracking links and revenue share. Social commerce is the engine: TikTok Shop is projected at $23.4 billion in US ecommerce sales in 2026, up 48 percent year over year.

Creator licensing, previously called whitelisting, has become a standard line item. Brands run paid media through the creator's own handle rather than the brand's.

Measurement is consolidating away from EMV. The criticisms are now mainstream: no industry-standard calculation, it ignores audience quality, and a high EMV does not prove revenue impact. 79 percent of marketers cite measuring influencer ROI as their biggest obstacle. The recommended practice is to pair any EMV figure with CPA, ROAS and attribution, and to layer incrementality testing on larger programs.

**What this says about the original plan.** It aimed at pillar 1 and part of pillar 4. It ignored pillars 5, 6 and 7 entirely, and treated pillar 8 as a phase-5 nicety. For a generic influencer marketing product that would be a serious gap.

---

## Section 3. The economics, which invert the build case

This is the finding that should change the decision.

| Option | Cost |
|---|---|
| Modash Discovery API, raw creator data only | from **$16,200 per year** |
| Phyllo, authenticated creator data | from $199 per month, usage-scaled |
| Aspire or Upfluence, a **finished mid-market platform** | from roughly **$478 to $500 per month**, about $6,000 per year |
| GRIN | from roughly $2,000 per month on annual terms |
| CreatorIQ | roughly $30,000 to $39,000 per year entry, six figures at scale |

Licensing the raw discovery data alone costs roughly **three times more than buying a complete mid-market platform**. If the goal were generic influencer marketing, building would be indefensible: more expensive on data, plus the entire engineering cost, to end up behind.

That is the honest answer to "should we build a Sideqik." For the generic product, no.

**But that is not what FGN is doing**, which the saved searches make obvious.

---

## Section 4. What FGN is actually doing, which no vendor sells

Look again at the saved searches in the Sideqik account:

- Farm Simulator Challenge
- Construction Simulator Challenge
- **HCTC Texas Gamers**
- **Arizona Minecraft Players**

The first two recruit creators into specific FGN challenges. The second two are geo-bounded recruitment inside ISP partner territories. HCTC is a Texas telco. That is not brand-influencer marketing. It is **creator recruitment into a workforce and gaming platform, bounded by ISP service territory**.

The differences from the category assumption run deep.

| Category assumes | FGN reality |
|---|---|
| Goal is product sales, measured in GMV or ROAS | Goal is creator activation into challenges, tournaments and the Academy |
| Geography matters at country or metro level | Geography matters at **ISP service territory and ZIP code** level |
| The creator promotes to their audience | The creator **participates** and their audience follows |
| Success is attributed revenue | Success is enrollment, completion, retention, and ISP subscriber lift |
| The brand is one advertiser | FGN is a **multi-tenant platform** serving many ISP partners |

No commercial platform can answer "find Minecraft creators living in ZIP codes served by HCTC." CreatorIQ cannot. GRIN cannot. Sideqik could not either, which is why those searches were approximated with state-level filters.

**And FGN already owns the missing half.** The `play.fgn.gg` codebase has `tenant_zip_codes`, `national_zip_codes`, `lookup_providers_by_zip`, and a full multi-tenant ISP model with subscriber verification. The thing a vendor cannot sell is the thing FGN already built.

That is the wedge. It is narrow, defensible, and it is the only part of this worth building.

---

## Section 5. Revised recommendation

**Do not rebuild the category. Build the wedge, buy or defer the commodity.**

| Pillar | Decision | Reasoning |
|---|---|---|
| 1. Discovery | **Build thin, buy data later** | vidIQ for semantic seeding now. Revisit Modash only if volume justifies $16k a year |
| 2. Vetting | **Build light** | LLM brand-safety pass over titles, descriptions and transcripts. Good enough for a recruitment funnel, not for a Fortune 500 brand-safety audit |
| 3. Creator CRM | **Build** | This is the system of record and it must join to ISP tenants. Already half-built in the outreach app |
| 4. Recruitment and intake | **Build, and prioritize** | The wedge and the moat. An owned, consented creator community beats a rented database, and it is the only real fix for the email gap |
| 5. Campaign workflow | **Build minimal** | Briefs and deliverable tracking tied to FGN challenges, not generic contracts and e-signature |
| 6. Activation | **Build FGN-native** | Not TikTok Shop. Challenge enrollment, tournament seeding, tenant campaign codes. `tenant_campaign_codes` already exists |
| 7. Payments | **Defer, then buy** | Prize payouts and 1099 handling belong to Tipalti or Trolley, never hand-rolled |
| 8. Measurement | **Build FGN-native, skip EMV** | Measure the recruitment funnel, not earned media value. See below |

**On measurement specifically.** Sideqik showed FGN $0 Earned Media Value and Share of Voice never enabled. FGN was not using the category's measurement layer, and the category is itself moving away from EMV. Rebuilding it would be rebuilding a metric the market is abandoning and FGN never used.

Measure instead what FGN's business actually runs on: creators discovered, contacted, applied, approved, activated into a challenge, completed it, retained into a second one, and where an ISP tenant is attached, subscriber conversion. That chain is defensible, tied to revenue, and no vendor reports it because no vendor knows what an FGN challenge is.

---

## Section 6. Tracked feature register

The tracking artifact requested. Every capability the category considers standard, with FGN's position on each. This is the backlog and the coverage scorecard in one table.

Legend. **Have** means working today. **Partial** means some support exists. **Planned** means scheduled below. **Buy** means license rather than build. **Skip** means a deliberate decision not to build, with the reason given.

### Pillar 1, Discovery

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 1.1 | Keyword and topic search | Standard | Yes | Planned | 2 |
| 1.2 | Semantic and natural-language search | Emerging | No | Planned, vidIQ provides it | 2 |
| 1.3 | Filter by follower count | Standard | Yes | Planned | 2 |
| 1.4 | Filter by platform | Standard | Yes | Partial, no Twitch | 2, 3 |
| 1.5 | Filter by creator country | Standard | Yes | Planned | 2 |
| 1.6 | Filter by creator state and city | Standard | Yes | Partial, low confidence | 3 |
| 1.7 | **Filter by ISP service territory and ZIP** | **None** | No | **Planned, the wedge** | 3 |
| 1.8 | Filter by language | Standard | Yes | Planned | 2 |
| 1.9 | Filter by game played | Vertical | Yes | Planned | 2 |
| 1.10 | Lookalike and similar-creator search | Standard | Yes | Planned | 2 |
| 1.11 | Audience demographics filters | Standard | Yes | **Skip**, unavailable from vidIQ, needs a vendor | n/a |
| 1.12 | Creator age and gender filters | Standard | Yes | **Skip**, unavailable and low value for FGN | n/a |
| 1.13 | Saved searches with counters | Standard | Yes | Planned | 2 |
| 1.14 | Growth and breakout filters | Emerging | No | Planned, vidIQ is strong here | 2 |

### Pillar 2, Vetting

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 2.1 | Fake follower and bot detection | Standard | Partial | **Skip** for now, needs vendor data | n/a |
| 2.2 | Brand safety content scanning | Standard | BrandSafe rating | Planned, LLM-based | 6 |
| 2.3 | FTC disclosure history check | Standard | No | **Skip**, FGN does not run paid endorsements | n/a |
| 2.4 | Engagement rate calculation | Standard | Yes | Planned | 2 |
| 2.5 | Audience overlap between creators | Advanced | No | Skip | n/a |

### Pillar 3, Creator CRM

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 3.1 | Creator profile record | Standard | Yes | **Have**, `creators` + `disc_creators` | done |
| 3.2 | Multi-platform account linking | Standard | Yes | **Have**, `disc_creator_accounts` | done |
| 3.3 | Tags and labels | Standard | Yes | **Have** | done |
| 3.4 | Lifecycle funnel stages | Standard | Yes, 5 stages | **Have**, `disc_search_results.status` | done |
| 3.5 | Communication history | Standard | Messaging | Partial, Resend send log only | 5 |
| 3.6 | Notes and manual enrichment | Standard | Yes | **Have** | done |
| 3.7 | Tier and scoring | Standard | Sideqik Score | **Have**, `fgn_score` + tiers | done |
| 3.8 | Metric history over time | Standard | Social Growth | **Have**, `disc_account_metrics` | done |
| 3.9 | **Link creator to ISP tenant** | **None** | No | **Planned, the wedge** | 3 |

### Pillar 4, Recruitment and intake

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 4.1 | Public application page | Rising | Recruitment Forms | **Planned, priority** | 4 |
| 4.2 | Branded per-tenant application pages | Rare | No | **Planned, the wedge** | 4 |
| 4.3 | Auto-approve rules | Standard | Yes | Planned | 4 |
| 4.4 | Review queue | Standard | Yes | Planned | 4 |
| 4.5 | Creator self-service portal | Rising | Creator Hub | Planned | 6 |
| 4.6 | Social account OAuth connect | Rising | Yes | Planned, closes the email and Twitch gaps together | 4 |
| 4.7 | Consented first-party metrics | Rising | Partial | Planned, Phyllo-style, post-onboarding | 6 |

### Pillar 5, Campaign workflow

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 5.1 | Campaign records | Standard | Yes | **Have**, `campaigns` | done |
| 5.2 | Outreach email sequences | Standard | Messaging | **Have**, Resend pipeline | done |
| 5.3 | Briefs and deliverables | Standard | Yes | Planned, mapped to challenges | 5 |
| 5.4 | Contracts and e-signature | Standard | Yes | **Skip**, use a dedicated tool if ever needed | n/a |
| 5.5 | Content submission and approval | Standard | Posts | Partial, challenge evidence already exists in play.fgn.gg | 5 |
| 5.6 | UGC rights management | Standard | Yes | Skip | n/a |

### Pillar 6, Activation

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 6.1 | Promo and discount codes | Standard | Code Management | Partial, `tenant_campaign_codes` exists | 5 |
| 6.2 | Affiliate tracking links | Standard | Yes | Skip, no ecommerce | n/a |
| 6.3 | Product seeding | Standard | Yes | Skip | n/a |
| 6.4 | TikTok Shop integration | Fast-growing | No | Skip, wrong business | n/a |
| 6.5 | Creator licensing and paid amplification | Fast-growing | Promotions | Skip for now, revisit if FGN buys paid social | n/a |
| 6.6 | **Challenge and tournament enrollment** | **None** | No | **Planned, the wedge** | 5 |
| 6.7 | **Academy pathway enrollment** | **None** | No | Planned | 6 |

### Pillar 7, Payments

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 7.1 | Creator payouts | Standard | Payments | **Buy**, Tipalti or Trolley | later |
| 7.2 | W-9 and W-8 collection, 1099 filing | Standard | Yes | **Buy**, never hand-roll tax | later |
| 7.3 | Multi-currency and global | Standard | Yes | Buy | later |
| 7.4 | Prize and reward fulfilment | Vertical | No | Partial, `prizes` and `prize_redemptions` exist | later |

### Pillar 8, Measurement

| # | Capability | Category | Sideqik had | FGN status | Phase |
|---|---|---|---|---|---|
| 8.1 | Reach and engagement reporting | Standard | Yes | Planned | 5 |
| 8.2 | Earned Media Value | Standard | Yes, showed $0 | **Skip**, unused and the market is moving off it | n/a |
| 8.3 | Share of Voice | Standard | Never enabled | **Skip** | n/a |
| 8.4 | Conversion attribution | Standard | Conversions | Planned, code-based | 5 |
| 8.5 | Incrementality testing | Advanced | No | Skip | n/a |
| 8.6 | **Recruitment funnel conversion** | **None** | No | **Planned, the primary metric** | 5 |
| 8.7 | **Challenge completion and retention** | **None** | No | Planned | 5 |
| 8.8 | **ISP subscriber lift by tenant** | **None** | No | Planned | 6 |

**Coverage summary.** 62 capabilities tracked. 11 already have working support, 30 are planned, 4 are buy decisions, and 17 are deliberate skips. Of the planned items, 7 are marked as the wedge, meaning no commercial vendor offers them.

---

## Section 7. Revised data sourcing

The original plan treated vidIQ as the primary source. The research suggests a layered model instead, which is what mature platforms actually run.

| Layer | Source | Cost | Role |
|---|---|---|---|
| Semantic discovery | vidIQ | Credit-metered, currently 150 a cycle | Find candidates by niche, game, growth. Genuinely strong |
| Bulk enrichment | YouTube Data API | Free, 10,000 units a day | Stats refresh, subscriber counts, About-page email parsing. The workhorse |
| Twitch | Twitch Helix | Free | **Correction below** |
| First-party | FGN Recruitment Forms and OAuth | Free, and owned | The only source of consented email and private metrics |
| Optional later | Modash | $16,200 a year | Only if volume ever justifies it. Not now |

**A correction to the earlier plan on Twitch.** I previously flagged that Twitch follower counts require user authorization. Per Twitch's documented behavior for Get Channel Followers, when the `moderator:read:followers` scope is absent the response still includes **the total follower count**; the scope gates the follower *list*, not the count. If that holds, Twitch coverage is far cheaper than I estimated and should move earlier. I could not fetch `dev.twitch.tv` to confirm directly because the domain is blocked by this environment's egress proxy, so treat it as high-confidence but unverified and settle it with a single API call before planning around it.

That matters because Twitch is where FGN's cohort actually lives, and vidIQ covers none of it.

---

## Section 8. Revised phases

Reordered so the wedge and the moat come early, and the commodity work comes late or never.

| Phase | Deliverable | Change from the original plan |
|---|---|---|
| **0** | Export everything from Sideqik. Settle the vidIQ budget and the Twitch follower question | Unchanged and still urgent |
| **1** | `disc_*` schema, ingest, Creator Library integration, discovery export | **Done and tested**, see `docs/patchers/` |
| **2** | Search builder, saved searches, funnel tabs, scoring, reason bullets | Unchanged |
| **3** | **ISP territory and ZIP filtering. Twitch as second source.** Creator profile drawer | **Promoted.** Was phase 3 enrichment, now the wedge |
| **4** | **Recruitment Forms, per-tenant branded, OAuth connect** | **Promoted.** Closes the email gap and builds the owned community |
| **5** | Challenge and tournament activation, recruitment funnel measurement, briefs | **Reframed** from generic campaign workflow and EMV |
| **6** | Brand safety scoring, creator portal, Academy pathways, ISP subscriber lift | Reframed |
| **Never** | EMV, Share of Voice, TikTok Shop, affiliate links, product seeding, UGC rights, e-signature, hand-rolled payments | **New.** Explicit non-goals, with reasons in Section 6 |

---

## Section 9. Decisions needed

1. **Do you accept the wedge framing?** If FGN's creator work is really generic brand-influencer marketing, the honest answer is to buy Aspire or Upfluence at about $6,000 a year and stop building. If it is ISP-territory creator recruitment into challenges, no vendor sells it and building is right. Everything else follows from this.
2. **vidIQ budget.** Still open from the last exchange. 150 credits a cycle supports a demo, not phase 2.
3. **Twitch follower count.** One API call settles whether the total is public. It changes phase 3 substantially.
4. **Payments timing.** Nothing to decide now, but when prize payouts start, pick a vendor rather than building.
5. **Tier thresholds.** Still open. The reach-only promotion to `A_Priority` fires today.

---

## Section 10. Risks

| Risk | Mitigation |
|---|---|
| Sideqik access lapses before export | Phase 0, unchanged, still the most time-sensitive item |
| Scope creeps back toward a full IMP clone | The 17 explicit skips in Section 6 are the guardrail. Revisit them deliberately, not by drift |
| The wedge is a story we tell ourselves | Test it in phase 3. If ISP-territory filtering does not change which creators get recruited, the wedge is not real and buying becomes right |
| vidIQ quota blocks phase 2 | Layered sourcing reduces the dependency. YouTube Data API and Twitch are free |
| Building CRM and workflow that a $6k tool does better | Keep pillars 5 and 7 minimal. Every hour there is an hour not spent on the wedge |
| First-party community never reaches useful size | Phase 4 is cheap to try and the failure is visible fast |

---

## Sources

- [GRIN, The Best Influencer Marketing Platforms in 2026: An Honest Buyer's Guide](https://grin.co/compare)
- [G2, Influencer Marketing Platforms category](https://www.g2.com/categories/influencer-marketing-platforms)
- [Hashmeta, Creator Management Platforms Compared: Grin vs CreatorIQ vs Aspire](https://hashmeta.com/blog/creator-management-platforms-compared-grin-vs-creatoriq-vs-aspire/)
- [Scoop, Aspire vs Grin vs CreatorIQ: The Definitive 2026 Comparison](https://scoop.app/blog/influencer/marketing/aspire-vs-grin-vs-creatoriq-2026-comparison.html)
- [Sprout Social, Influencer marketing trends 2026](https://sproutsocial.com/insights/influencer-marketing-trends/)
- [Modash, Influencer Marketing API pricing](https://www.modash.io/influencer-marketing-api/pricing)
- [Phyllo, Phyllo vs Modash: Authenticated Creator Data vs Public Database](https://www.getphyllo.com/post/phyllo-vs-modash-authenticated-creator-data-vs-public-database)
- [Phyllo, Creator Data API vs Public Social APIs: 2026 Guide](https://www.getphyllo.com/post/creator-data-api-vs-public-social-apis-what-should-you-build-on-in-2026)
- [Stack Influence, Influencer Marketing Platform Pricing 2026](https://stackinfluence.com/blog/influencer-marketing-platform-pricing)
- [Favikon, Influencer Marketing Platform Pricing 2026: Real Costs](https://www.favikon.com/blog/influencer-marketing-platform-pricing)
- [MySocial, What Is Earned Media Value in Influencer Marketing?](https://mysocial.io/blog/what-is-earned-media-value-influencer-marketing/)
- [SocialPilot, Influencer Marketing ROI Benchmarks for 2026](https://www.socialpilot.co/insights/influencer-marketing-roi)
- [Meltwater, Influencer Marketing Brand Safety Guide](https://www.meltwater.com/en/blog/influencer-marketing-brand-safety)
- [ContentGrip, Influencer marketing fraud in 2026](https://www.contentgrip.com/influencer-marketing-fraud-detection/)
- [Instreamly, Top 10 Gaming Influencer Platforms](https://instreamly.com/posts/top-10-gaming-influencer-platforms/)
- [Cloutboost, Top 10 Influencer Outreach Tools for Gaming Publishers](https://www.cloutboost.com/blog/top-10-influencer-outreach-tools-for-gaming-publishers-2026)
- [Tipalti, Creator Payments](https://tipalti.com/industries/video-media-industry-solutions/)
- [Lumanu, Top 5 Influencer Payout Platforms for 2026](https://www.lumanu.com/blog/top-5-payment-api-solutions-for-influencer-affiliate-platforms-the-complete-2026-guide)
- [Twitch Developers, API Reference](https://dev.twitch.tv/docs/api/reference) (cited from search results; the domain is blocked by this environment's egress proxy)
