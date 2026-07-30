# Creator and Influencer Discovery Platform

**Build plan to replace Sideqik with an in-house discovery module inside FGN Creator Outreach**

Status: plan, not yet implemented. Written 2026-07-30.

---

## Summary

FGN currently rents creator discovery from Sideqik (white-labeled at `apps.sideqik.com`, FGN branding in the header). The account shows **"Your account is past due. Some functionality may be disabled."** The plan below rebuilds the parts FGN actually uses, inside the existing Streamlit app at `outreach.fgn.gg`, with vidIQ as the discovery data source.

The good news on scoping is that the outreach app already models Sideqik's output. `fgn_pipeline/processor.py` ingests Sideqik exports, Sideqik is the first entry in `BUILT_IN_SCHEMAS` with auto-mapping, and `INTERNAL_FIELDS` already defines the destination shape. A discovery module does not need a new contract. It needs to fill the existing one from a different source.

The hard news is that two of Sideqik's headline capabilities cannot be reproduced from vidIQ, and one of them (audience demographics) has no cheap substitute at all. Those are called out explicitly in the capability map rather than buried.

---

## Section 1. What Sideqik gives FGN today

Enumerated from the live account, so the rebuild targets real usage rather than the marketing site.

**Navigation**

| Group | Items |
|---|---|
| Discovery | Recommendations (Smart Search), Recruitment Forms |
| Community | My Creators, Campaigns, Code Management, Messaging, Payments, Posts |
| Reports | Campaigns, Creators, Conversions |
| Engagement | Promotions |

**Dashboard.** My Creator Cohort tile (1k Creators, 3 Shortlisted, 2 Recruiting, 0 New Applicants), Share of Voice (never enabled for FGN), Recommendations, Campaigns and Promotions, and a 90-day Performance row (Revenue, Awareness as Earned Media Value, Social Growth). Social Growth and Share of Voice both read "contact your CSM to set up", so neither is in use. Export as PDF.

**Smart Search list.** One card per saved search with an avatar collage, a criteria summary line, created date, and four counters: Results, Shortlisted, Recruiting, Added. Live examples show the real workload.

| Saved search | Results | Created |
|---|---|---|
| My Creator Cohort | 0 results, 3 shortlisted, 2 recruiting, 1081 added | 2023-09-22 |
| Farm Simulator Challenge | 3899 | 2026-04-27 |
| HCTC Texas Gamers | 2602 | 2026-04-06 |
| Arizona Minecraft Players | 2874 | 2026-03-17 |
| Construction Simulator Challenge | 303 | 2026-04-16 |

**Create Smart Search.** Name plus a criteria chip builder ("I'm looking for creators..."), validated so at least one criterion is required. Chips available: by creator age, by creator location, by creator gender, who talk about, who are similar to, by total followers, by BrandSafe rating, by language, by audience gender, by audience ethnicity, by audience location, by audience age, who play, by followers on social platform. Plus an include-scope dropdown (default All Creators) and a checkbox "Only return creators who match all criteria" (AND versus OR).

The populated Farm Simulator Challenge search reads: who talk about Farming, Farming simulator, Farming Simulator 25; who play Farming Simulator 25, 22, 19; whose audience is largely in United States; who live in United States.

**Results view.** Funnel tabs (Results, Shortlisted, Recruiting, Added, Archived), free-text search, sort, filter, edit, Select All for bulk actions. Each creator card carries an avatar, handle, bio snippet, follower count, category, and a row of platform icons (Instagram, Twitch, YouTube, X, Kick, Facebook), then thumbs-up reason bullets, then Archive and Shortlist actions, then matched topic chips, a per-topic 90-day post count with network icons, and recent content thumbnails with dates and view or engagement counts.

Real reason bullets, worth quoting because they are the feature that makes the tool feel intelligent:

- "7x more of audience is in United States than for average creator"
- "Plays Farming Simulator 25 and Farming Simulator 19"
- "Houston, Texas, United States"
- "Has 8 posts on 2 out of 3 topics" (in the past 90 days)

Note the cohort skews Twitch. Of the three visible result cards, all three list Twitch, two list YouTube, and stream descriptions like "Justin streamed Apex Legends, Farming Simulator 25, Just Chatting, and Rocket League for about 3 hours" come from Twitch. This matters for source selection below.

---

## Section 2. Decisions already taken

| Decision | Choice |
|---|---|
| Where it gets built | The Streamlit app at `outreach.fgn.gg`, alongside the existing Creator Library and Resend send pipeline |
| Primary data source | vidIQ, already connected as an MCP server |
| Target data shape | The existing `INTERNAL_FIELDS` and `Creator` dataclass, so the send pipeline needs no changes |

---

## Section 3. Do this first, before anything is built

The Sideqik account is past due and the banner warns that functionality may already be degrading. Everything of value in that account is data FGN paid to accumulate and cannot regenerate.

**Export, this week, before any code is written**

1. My Creator Cohort, all 1081 Added creators, full column set
2. The 3 Shortlisted and 2 Recruiting records, including status and any notes
3. Each saved search's criteria, captured as a screenshot or copied text (Farm Simulator Challenge, Construction Simulator Challenge, HCTC Texas Gamers, Arizona Minecraft Players, and any others below the fold)
4. Any Recruitment Form definitions and their submissions
5. Campaign and Creator reports for whatever history the account will hand over

The saved-search criteria are the specification for the new search builder, and the 1081 Added creators are the seed corpus that makes the new tool useful on day one instead of empty. Losing account access before this export happens turns a rebuild into a rebuild plus a re-acquisition.

---

## Section 4. Capability map, honestly

vidIQ's channel search is genuinely strong. A live test run for this plan (query "Farming Simulator 25 gameplay and let's plays", country US, 2k to 500k subscribers, active since 2026-05-01) returned ten precisely on-target US channels with niche classification, sub-niches, subscriber and view counts, 7-day, 30-day and 1-year growth on both subs and views, average views per video, estimated monthly earnings, long-form versus shorts mix, average durations, last upload date, faceless and breakout flags, and full channel descriptions. The result pool reported 10,000 total. That is a real discovery engine, not a toy.

But it is a YouTube-first engine with Instagram and TikTok bolted on, and it knows nothing about audiences.

| Sideqik criterion | vidIQ support | Plan |
|---|---|---|
| who talk about | Yes. Semantic `query` over niche and description embeddings, plus a typo-tolerant `description` phrase filter | Full parity |
| who play (game titles) | Partial. Semantic query plus `subNiches` and game categories in `mainCategory`. Per-title precision (FS25 versus FS22 versus FS19) is weaker than Sideqik's | Approximate with query plus title and transcript evidence from `vidiq_channel_videos` and `vidiq_video_transcript`, then store per-title evidence counts |
| who are similar to | Yes. `vidiq_similar_channels` with niche, country, language and subscriber banding | Full parity, and a genuinely good lookalike-expansion engine |
| by language | Yes. `languages` plus `exactLanguage` | Full parity |
| by total followers | Yes for YouTube, Instagram, TikTok | Parity on those three only |
| by followers on social platform | YouTube, Instagram, TikTok only | **Gap.** No Twitch, Kick, X or Facebook. See Twitch note below |
| by creator location | Country only (ISO 3166-1) | Country is full parity. US state and city ("Houston, Texas") are **not available**. Best-effort recovery by parsing bios and descriptions, flagged low confidence |
| by BrandSafe rating | No | Build an in-house score from recent titles, descriptions, transcripts and comments (all available from vidIQ) via the Claude API. Different numbers than Sideqik, same function |
| by audience location | **No.** `vidiq_subscriber_insights` works only on channels FGN owns | **Hard gap.** Substitute a labeled proxy (channel country plus publish language). The "7x more of audience is in United States" bullet is not reproducible |
| by audience age, gender, ethnicity | **No** | **Hard gap.** Drop, or license a vendor. Do not fake it |
| by creator age, gender | No | Drop, or allow manual tagging on shortlisted creators |
| Recent posts per topic, content thumbnails, engagement | Yes. `vidiq_channel_videos`, `vidiq_video_stats`, `vidiq_instagram_tiktok_outlier_search`, `vidiq_ig_profile_reels` | Full parity, and outlier scoring is better than Sideqik's flat post counts |
| Share of Voice | Not applicable | Drop. Never enabled for FGN |
| Social Growth tracking | Yes, better. 7d/30d/1y on subs and views per channel | Improve on Sideqik, which required a CSM to set up |
| Earned Media Value | Derivable from content views and a CPM assumption | Phase 5 |
| Payments | Out of scope | Later, if ever |
| Messaging | Already solved by the existing Resend pipeline | Reuse what exists |

**Two gaps that need naming clearly.**

**Email addresses.** No vidIQ endpoint returns one, and `email` is the single required field in the existing ingest. This is the most important gap because it is the one that blocks the pipeline the discovery tool feeds. Three partial answers: parse business-inquiry addresses out of channel descriptions and About pages, route discovered creators through a first-party Recruitment Form so they supply their own address, or work the Instagram and Twitch DM paths outside email. The Recruitment Form path is the durable one, which is why it is Phase 4 rather than Phase 6.

**Twitch.** FGN's cohort is Twitch-heavy and vidIQ covers no Twitch at all. The Twitch Helix API is free and gives profile, live status and current game from an app token. Follower counts now require user authorization, so exact follower parity needs either the creator to connect their account or a scoped token. Recommend adding Twitch as the second source in Phase 3, since Twitch presence is arguably more predictive for FGN's gaming challenges than YouTube subscriber count.

---

## Section 5. How a Streamlit app on a VPS reaches vidIQ

vidIQ is connected to Claude as an MCP server. That connection belongs to a Claude session, not to a Python process on a Hostinger box, so the app cannot call `vidiq_channel_search` directly. Three ways to close that, in descending order of preference.

**Option A, recommended. Claude API with the MCP connector.** The app already holds an Anthropic API key for the AI Writer, so no new vendor is involved. The Messages API can attach a remote MCP server server-side, which means the app asks Claude to run the discovery and Claude calls vidIQ.

```python
resp = client.beta.messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[{
        "type": "url",
        "name": "vidiq",
        "url": VIDIQ_MCP_URL,
        "authorization_token": VIDIQ_MCP_TOKEN,
    }],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "vidiq"}],
    output_config={"format": {"type": "json_schema", "schema": CREATOR_BATCH_SCHEMA}},
    messages=[{"role": "user", "content": build_search_brief(criteria)}],
)
```

Both halves are required. `mcp_servers` without a matching `mcp_toolset` entry is rejected as a validation error. Structured outputs via `output_config.format` mean the app gets schema-validated creator records back rather than prose it has to parse. Open item, and the one thing to verify before committing to this option: obtaining a machine-usable `authorization_token` for the vidIQ MCP endpoint. vidIQ's MCP is OAuth-backed and the current connection was authorized interactively.

**Option B. A direct vidIQ REST key.** Cleanest architecture if vidIQ will issue one, since it removes Claude from the data path entirely and makes cost predictable. Their MCP is backed by an API, so the endpoints exist. Worth one email to vidIQ asking about programmatic access before defaulting to Option A.

**Option C, the bridge that works today. Claude in the loop.** A Claude session runs the searches and writes a JSONL file the app ingests, using the same mapping machinery that already handles Sideqik exports. Zero new infrastructure, provable this week, not self-serve. Good enough to seed the database in Phase 1 while Option A or B is sorted out.

Recommendation: build Phase 1 against Option C so the ingest path and data model are exercised immediately, with the client interface abstracted behind one module so switching to Option A or B later is a single-file change.

---

## Section 6. Credit budget, and why Sideqik's 3899-result search is not reproducible today

Measured directly, not estimated. Balance before the test search was 150 credits, and 145 after, so:

| Call | Cost | Notes |
|---|---|---|
| `vidiq_channel_search` | 5 credits | **Per call, independent of `limit`.** Always request `limit: 50` |
| `vidiq_channel_stats` | 5 credits | Per channel |
| `vidiq_ig_profile` | 5 credits | Per handle |
| `vidiq_instagram_tiktok_outlier_search` | 5 credits | Per call |
| `vidiq_ig_accounts_from_outliers` | 10 credits | Per call |
| `vidiq_balance` | 0 credits | Free, so log it after every batch |

The plan is 150 renewable credits per cycle, capped at 150, no add-on pool, resetting 2026-08-13. That is 30 search calls per cycle, or up to 1,500 channel rows if every call is a 50-result search and nothing is spent on enrichment.

**So the Farm Simulator Challenge search that returned 3899 results cannot be reproduced in one pass at this tier.** Three things make that survivable, and one makes it go away.

1. Cost is per call, not per result, so `limit: 50` on every search is free extra coverage. Never request less.
2. Everything is cached permanently in SQLite. Coverage accumulates across cycles instead of resetting, and a repeated search is a database query, not an API call.
3. The YouTube Data API is the enrichment workhorse and is effectively unmetered for this use. The free quota is 10,000 units per day, `channels.list` costs 1 unit for up to 50 channel IDs, so refreshing the entire cached corpus daily costs a rounding error. Use vidIQ for the semantic discovery it is uniquely good at, and YouTube Data API for stats refresh, subscriber counts, and About-page email parsing.
4. **Upgrade the vidIQ plan.** 150 credits per cycle is a hobbyist tier being asked to do a commercial job. This is a small line item against what Sideqik costs, and it is the single highest-leverage decision in this plan.

Every run logs its spend to `disc_credit_log` and surfaces remaining balance in the UI before a search is submitted, so a search that would exhaust the cycle is refused rather than silently truncated.

---

## Section 7. Data model

New tables in the existing `db/outreach.db`, all prefixed `disc_` so they are visually separate from the campaign schema. Foreign keys enforced per connection, matching the existing convention.

**Creator identity and accounts**

| Table | Purpose |
|---|---|
| `disc_creators` | One row per person. `id`, `primary_platform`, `display_name`, `bio`, `country`, `region`, `city`, `location_confidence`, `avatar_url`, `niche`, `niche_confidence`, `brandsafe_score`, `brandsafe_reasons`, `fgn_score`, `tier`, `email`, `email_source`, `email_confidence`, `first_seen`, `last_refreshed` |
| `disc_creator_accounts` | One row per social account. `creator_id`, `platform`, `handle`, `external_id`, `url`, `followers`, `verified`, `last_refreshed`. This is what renders Sideqik's platform icon row |
| `disc_account_metrics` | Time-series snapshots. `account_id`, `followers`, `views`, `videos`, `growth_7d`, `growth_30d`, `growth_1y`, `avg_views`, `est_earnings`, `captured_at`. Powers growth tracking, which Sideqik charged a CSM setup for |

**Topical and content evidence**

| Table | Purpose |
|---|---|
| `disc_creator_topics` | `creator_id`, `topic`, `source`, `confidence`, `post_count_90d`. Drives "who talk about" and the topic chips |
| `disc_creator_games` | `creator_id`, `game_title`, `evidence_count`, `last_seen`. Drives "who play" and the "Plays Farming Simulator 25 and 19" bullet |
| `disc_content` | `creator_id`, `platform`, `content_id`, `url`, `title`, `published_at`, `views`, `likes`, `comments`, `thumbnail_url`, `is_outlier`, `outlier_score`. Renders the content thumbnail panel |

**Search and funnel**

| Table | Purpose |
|---|---|
| `disc_searches` | `name`, `criteria_json`, `match_all`, `include_scope`, `created_at`, `last_run_at`, `result_count` |
| `disc_search_results` | `search_id`, `creator_id`, `score`, `reasons_json`, `status`, `status_changed_at`. One table produces all five funnel tabs and all four dashboard counters. `status` is one of `result`, `shortlisted`, `recruiting`, `added`, `archived` |

**Intake and audit**

| Table | Purpose |
|---|---|
| `disc_forms` | Recruitment form. `slug`, `name`, `brand_config_json`, `fields_json`, `auto_rules_json`, `active` |
| `disc_form_submissions` | `form_id`, `payload_json`, `creator_id`, `status`, `reviewed_by`, `reviewed_at` |
| `disc_credit_log` | `tool`, `params_hash`, `credits`, `called_at`, `cache_hit`. Non-negotiable given the quota |

**Join to what already exists.** When a creator acquires an email, `disc_creators.email` hashes to the same SHA-256 16-hex `creator_id` the existing `Creator` dataclass uses, so discovery records and Creator Library records line up without a migration. Two export paths: a direct push into the Creator Library through `ingest_v2.process_upload_with_mapping`, and a CSV writer that emits the exact Sideqik column order, which the existing schema detector already auto-maps. The CSV path is the fallback and also the thing that proves parity.

---

## Section 8. New modules

All under `outreach/discovery/`, imported by new pages in `outreach/pages/`. Following the existing conventions: standard library preferred, dataclasses for plain data, f-strings, `st.error` for user-visible failures.

| Module | Responsibility |
|---|---|
| `discovery/client.py` | The one seam that hides how vidIQ is reached. Options A, B and C from Section 5 all implement this interface |
| `discovery/schema.py` | `disc_*` DDL, migrations, and the dataclasses |
| `discovery/criteria.py` | Criterion model, chip definitions, validation ("at least one criteria"), and translation from FGN criteria to vidIQ search parameters |
| `discovery/search.py` | Run a saved search, dedupe against cache, write results, spend credits through the log |
| `discovery/enrich.py` | YouTube Data API and Twitch Helix enrichment, description email parsing, content and metric refresh |
| `discovery/scoring.py` | `fgn_score`, tier assignment, and deterministic reason-bullet generation |
| `discovery/brandsafe.py` | Claude-API brand-safety pass over recent titles, descriptions, transcripts and comments |
| `discovery/export.py` | Push to Creator Library, and Sideqik-column-order CSV |
| `forms/` | The public Recruitment Form service. See Phase 4 |

---

## Section 9. UI

New sidebar group mirroring the vocabulary FGN already uses, so nothing has to be relearned.

| Page | Contents |
|---|---|
| Discovery, Searches | Saved-search list with criteria summary, created date, and the four counters. New Search button. Remaining vidIQ credits shown here |
| Discovery, Search Builder | Name field plus the criterion chip builder, include-scope, and match-all checkbox. Chips that map to unavailable data are either absent or visibly labeled as proxy or manual |
| Discovery, Results | Funnel tabs, search, sort, bulk select. Creator cards with avatar, handle, bio, followers, platform badges, reason bullets, topic chips, 90-day post counts and content thumbnails. Archive and Shortlist actions |
| Discovery, Creator Profile | Full drawer. All accounts, metric history charts, topic and game evidence, content grid, brand-safety detail, email and its provenance, manual tags, notes |
| Discovery, Recruitment Forms | Form builder, auto-approve rules, submission review queue |
| Reports, Creators | Cohort composition, tier distribution, growth, platform mix, EMV |

Reason bullets are generated deterministically from the matched criteria so they stay honest, and the audience-geo bullet is replaced rather than faked. Sideqik says "7x more of audience is in United States than for average creator". The replacement says "Channel based in United States, publishes in English", which is what the data actually supports.

---

## Section 10. Scoring

`fgn_score`, 0 to 100, replacing `sideqik_score` in the same column so the send pipeline's tier logic is untouched. Components, each stored separately so the score is explainable in the UI rather than a black box:

| Component | Source |
|---|---|
| Topic and game match strength | Semantic score, matched-criteria count, per-title evidence count |
| Audience-geo proxy | Channel country and publish language, weighted lower than Sideqik weighted real audience data, and labeled as a proxy |
| Activity and recency | Last upload, 30-day post count |
| Engagement rate | Average views divided by followers, per platform |
| Growth | 30-day and 1-year subscriber and view growth |
| Brand safety | The in-house score from `brandsafe.py` |

Mapped onto the existing `A_Priority`, `B_Core`, `C_Longtail` tiers, so `create_broadcast_from_creators` keeps working with no change.

---

## Section 11. Recruitment Forms, and the one architectural wrinkle

Recruitment Forms must be publicly reachable by creators who have no login. The Streamlit app is behind PBKDF2 auth applied app-wide, so a Streamlit page cannot be the public form.

Recommended shape: a small FastAPI service on `127.0.0.1:8503`, a third systemd unit alongside `fgn-outreach` and `fgn-media`, routed by Caddy at a public path or its own subdomain, writing to the same SQLite file. The Streamlit app owns the builder and the review queue. The FastAPI service owns only the public GET and POST. That keeps the auth boundary clean and adds no new datastore.

This is also where the email gap closes. A creator who applies supplies their own address, consents, and can connect socials, which produces exactly the consented, accurate, FGN-owned records that no scraped source can.

---

## Section 12. Phases

Each phase ships something usable. Patcher waves follow the `operations.md` pattern: pure ASCII, sha verification, exactly-one-match guard, backup directory, idempotence check, `sudo chown fgn:fgn`, restart `fgn-outreach`.

| Phase | Deliverable | Notes |
|---|---|---|
| **0** | Export everything from Sideqik. Decide the vidIQ plan tier. Resolve the client option from Section 5 | No code. Blocking, and time-sensitive because of the past-due banner |
| **1** | `disc_*` schema, `client.py` against Option C, JSONL ingest, Creator Library push, Sideqik-column CSV export | Makes the 1081 rescued creators queryable in-house and proves the data model end to end |
| **2** | Search Builder, saved searches, search execution, funnel tabs, scoring, reason bullets | This is the phase where the tool replaces Sideqik's core loop |
| **3** | Creator Profile drawer, content panel, topic chips, YouTube Data API enrichment, Twitch Helix as second source | Twitch matters more for FGN's cohort than its position here suggests. Pull it forward if the gaming cohort is the priority |
| **4** | Recruitment Forms service, auto-approve rules, review queue | Closes the email gap. Arguably the highest-value phase after 2 |
| **5** | Reports (Creators, Campaigns, Conversions), EMV, growth tracking, dashboard tiles | Restores the reporting Sideqik provided |
| **6** | Brand-safety scoring, and Promotions or Code Management only if actually wanted | Both were unused in the live account. Confirm before building |

---

## Section 13. Open decisions

1. **vidIQ plan tier.** 150 credits per cycle will not support Phase 2 at realistic volume. What is the budget?
2. **Audience demographics.** Accept a labeled proxy, or license a vendor (Modash, Phyllo, InsightIQ)? This is the one gap money can close and prompting cannot.
3. **Twitch priority.** Keep it in Phase 3, or pull it into Phase 2 given how Twitch-heavy the cohort is?
4. **vidIQ access path.** Ask vidIQ about a REST key (Option B) in parallel with building against Option C?
5. **Repos.** `FGN2025/fgn_creator_outreach` and `fgn_campaign_pipeline` are not attached to this session, and there is no SSH client or key in this container. Attach the repos so implementation patches are written against real file bytes rather than a summary.

---

## Section 14. Risks

| Risk | Mitigation |
|---|---|
| Sideqik access lapses before export | Phase 0 first, this week. Nothing else matters if the 1081 creators are lost |
| vidIQ credits exhausted mid-search | Hard pre-flight check against balance, `limit: 50` always, permanent caching, `disc_credit_log` audit |
| Audience-geo proxy is quietly treated as real audience data | Label it as a proxy in the UI, weight it below real signals in scoring, never render Sideqik-style "7x" claims |
| Discovery produces creators with no email, so the send pipeline cannot use them | Description and About-page parsing plus Recruitment Forms in Phase 4. Track `email_source` and `email_confidence` per record |
| Per-title game precision is weaker than Sideqik | Store per-title evidence counts from titles and transcripts, and show the evidence in the profile so a human can confirm |
| vidIQ MCP token cannot be obtained for machine use | Option C works today with no new credentials, and `client.py` isolates the switch |
| Rebuilding unused features | Share of Voice, Social Growth, Payments and Promotions were all unused or unconfigured in the live account. Confirm before building any of them |

---

## Next step

Two things unblock everything else. Export the Sideqik cohort and saved-search criteria before the past-due account degrades further, and say what the vidIQ budget is so Phase 2 can be scoped against real quota instead of 30 searches a month. Attach the two outreach repos and Phase 1 can be written as patcher waves against the actual code.
