# YouTube Social Channel — Implementation Plan

Plan only. No code changes yet. Sequenced so nothing merges into the dispatcher or MCP tools until the Acme Broadband Facebook rehearsal is complete; database and worker groundwork can land in parallel behind flags.

---

## 0. Sequencing & non-disturbance

- **Facebook rehearsal protection.** No edits to `publish-to-social` `facebook` / `instagram` cases, no changes to existing `scheduled_posts` columns, and no changes to existing MCP tool required fields until rehearsal signoff.
- **Landing order:** (1) DB additive migration → (2) generic refresh worker (no YouTube callers yet) → (3) OAuth connect flow behind a `youtube_enabled` app_setting → (4) dispatcher `youtube` case + quota guardrail → (5) MCP schema extensions → (6) verification → (7) enable flag.

---

## 1. Google Cloud prerequisites (Darcy, before build starts)

Darcy owns these in the Google Cloud console; nothing in this app can substitute.

1. **GCP project** dedicated to FGN social publishing (isolates the 10k-unit/day quota from any other Google workload).
2. **Enable YouTube Data API v3.**
3. **OAuth consent screen**
   - User type: **External**.
   - App name, support email, developer contact, homepage, privacy policy URL, terms URL (public FGN URLs already exist).
   - **Sensitive scopes:** `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`.
   - Authorized domains: `fgn.gg`, `lovable.app` (published + preview).
4. **OAuth 2.0 Client ID (Web application)**
   - Authorized redirect URI: `https://<supabase-project>.functions.supabase.co/youtube-oauth-callback` (single canonical callback; env-driven).
   - Client id + secret stored as project secrets: **`YOUTUBE_OAUTH_CLIENT_ID`**, **`YOUTUBE_OAUTH_CLIENT_SECRET`**.
5. **App verification (critical path).**
   - `youtube.upload` is a **sensitive scope**; while the OAuth app is in **Testing** mode, Google issues **refresh tokens that expire after 7 days** and limits to 100 test users. That makes Testing mode unusable for production publishing.
   - Darcy must submit for **OAuth app verification** (brand verification + sensitive-scope review). Typical lead time: **2–6 weeks**, sometimes longer if Google requests a demo video of the scope in use.
   - Until verification is granted, YouTube stays behind the `youtube_enabled=false` app_setting and is exercised only against the small allowlist of test users Darcy configures on the consent screen.
6. **Test channel** on a Google account added to the test-users list, for end-to-end rehearsal uploads at `privacyStatus=unlisted`.

Verification-blocked risk stated up front: **YouTube cannot go live for real tenants until Google grants verification.** Rollout of the connect UI to tenant admins waits on that.

---

## 2. Database migration (additive, safe with in-flight rehearsal)

Single migration, all `ADD COLUMN … DEFAULT` / new tables — no changes to existing FB/IG code paths.

### 2a. `social_connections`

Already has `access_token`, `refresh_token`, `token_expires_at`. Add:

- `provider_account_id text` — YouTube channel id, LinkedIn urn, etc.
- `provider_account_label text` — channel title / page name for UI.
- `scopes text[]` — granted OAuth scopes (audit + future re-consent detection).
- `oauth_error text`, `oauth_error_at timestamptz` — populated by refresh worker on failure so UI can prompt reconnect.

No changes to existing rows required; nullable columns.

### 2b. `scheduled_posts`

- `media_type text NOT NULL DEFAULT 'image'` — enum-lite: `image | video`. Check constraint.
- `video_url text NULL` — permanent Supabase Storage URL for uploaded video asset.
- `platform_metadata jsonb NOT NULL DEFAULT '{}'::jsonb` — **recommended over dedicated columns** because YouTube-specific fields (`title`, `description`, `tags`, `privacyStatus`, `categoryId`, `madeForKids`, `thumbnail_url`, `shorts` hint) do not generalize to FB/IG/LinkedIn/X and we do not want a wide sparse table. Future platforms drop their own keys under the same jsonb.
- Named jsonb shape for YouTube (validated in propose tool, not in DB):
  ```
  {
    "youtube": {
      "title": string ≤100,
      "description": string ≤5000,
      "tags": string[] (optional, joined length ≤500),
      "privacyStatus": "private" | "unlisted" | "public",
      "categoryId": string (default "20" Gaming),
      "madeForKids": boolean (default false),
      "thumbnail_url": string url (optional),
      "shorts": boolean (hint; enforces vertical + auto-append " #Shorts" if not present and video ≤60s)
    }
  }
  ```
- Backfill: none needed; existing rows default to `image`.

### 2c. Quota tracking

New table `youtube_publish_quota`:

```
project_day date PRIMARY KEY,        -- UTC date; single-project quota lives at platform level
uploads_count int NOT NULL DEFAULT 0,
last_update timestamptz NOT NULL DEFAULT now()
```

Plus `app_settings` rows:
- `youtube_daily_cap` (int, default **5**) — 1 unit of headroom vs the 6-upload ceiling at 1600 units × 6 = 9600 of 10000.
- `youtube_enabled` (bool, default **false**) — global kill switch until Google verification lands.

GRANT block per project standards; `service_role` writes, `authenticated` reads for admin UI, no `anon`.

### 2d. Refresh worker state

Reuses existing `social_connections` columns; no new table. Worker maintains a small `social_token_refresh_log` (optional, defer to Phase 2 if needed).

---

## 3. OAuth connect flow (YouTube-specific; scaffolds a generic pattern)

New edge functions:

- **`youtube-oauth-start`** (verify_jwt=true): builds Google auth URL with `access_type=offline`, `prompt=consent` (forces refresh token issuance every time), `state = signed(tenant_id, user_id, nonce)`, scopes `youtube.upload youtube.readonly`. Returns URL for the client to `window.location = …`.
- **`youtube-oauth-callback`** (verify_jwt=false, but validates signed `state`): exchanges code for tokens, calls `youtube/v3/channels?mine=true` to fetch channel id + title, upserts `social_connections` row with `platform='youtube'`, `access_token`, `refresh_token`, `token_expires_at = now + expires_in`, `provider_account_id = channelId`, `provider_account_label = channelTitle`, `scopes`. Redirects back to `/tenant/marketing?tab=social&connected=youtube`.

UI: `SocialAccountsManager.tsx` gets a **Connect with Google** button for YouTube (only rendered when `youtube_enabled` app_setting is true). Existing paste-token dialog is not offered for YouTube.

---

## 4. Generic token refresh worker

New edge function **`refresh-social-tokens`** invoked by `pg_cron` every **10 minutes**.

Behavior — **platform-agnostic**, dispatches per row's `platform`:

1. Selects `social_connections` where `is_active=true`, `refresh_token IS NOT NULL`, and `token_expires_at < now() + interval '30 minutes'`.
2. For each row, calls a per-platform refresh strategy:
   - `youtube` → Google token endpoint with client id/secret + refresh_token.
   - `linkedin`, `twitter` → strategy stub returning "not implemented" so future builds slot in without changing the worker.
3. On success: update `access_token`, `token_expires_at`, clear `oauth_error`.
4. On failure (revoked, expired refresh_token, 400 `invalid_grant`): set `oauth_error`, `oauth_error_at`, mark `is_active=false` if unrecoverable, and enqueue an in-app + email notification to the tenant admin via `enqueue_marketing_notification` with category `social_connection_expired`.

Also exposes a **helper `refreshTokenIfNeeded(connection_id)`** in `_shared/social/refresh.ts` that the dispatcher calls immediately before publish, so YouTube uploads never race a stale token.

Fills the pre-existing gap: `refresh_token` / `token_expires_at` finally have writers *and* readers.

---

## 5. Dispatcher: `publish-to-social` `youtube` case

New `case "youtube":` — **no edits to `facebook` / `instagram` / `twitter` / `linkedin` branches.**

Pre-publish sequence:

1. **Undeliverable prechecks** (extend existing checks):
   - `media_type !== 'video'` → mark undeliverable, reason `youtube_requires_video`.
   - `video_url` missing → undeliverable, reason `youtube_missing_video_url`.
   - `platform_metadata.youtube.title` missing or >100 → undeliverable, reason `youtube_invalid_title`.
   - `platform_metadata.youtube.description` >5000 → undeliverable, reason `youtube_invalid_description`.
   - `youtube_enabled` app_setting false → undeliverable, reason `youtube_disabled`.
2. **Quota check** against `youtube_publish_quota` for today (UTC): if `uploads_count >= youtube_daily_cap`, do **not** fail — reschedule row to `tomorrow 09:00 tenant-local` and set `status='pending'`, then enqueue notification `youtube_quota_deferred` (category `schedule_conflict`-style, in-app + email to admins/managers). Increment a `deferrals_count` on the row for observability.
3. **Refresh token** via `refreshTokenIfNeeded(connection_id)`.
4. **Upload** using YouTube Data API v3 **resumable** `videos.insert`:
   - Step 1: POST `/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status` with metadata body (snippet: title/description/tags/categoryId; status: privacyStatus, selfDeclaredMadeForKids).
   - Step 2: PUT the video bytes streamed from `video_url` to the returned upload URL. Retry on 5xx / 308 resume responses per Google's resumable protocol.
   - Step 3: If `thumbnail_url` present, `thumbnails.set` with the fetched image.
5. On success: `post_url = https://youtube.com/watch?v=<id>` (or `youtu.be/shorts/<id>` if `shorts` flag), increment `youtube_publish_quota.uploads_count`, mark row `published`.
6. On failure: standard `failed` + `error_message`, no quota increment.

Shorts handling per report notes: if `shorts=true`, append ` #Shorts` to description if not already present, and validate that the metadata reasonably matches Shorts (vertical + ≤60s is enforced client-side at propose time; dispatcher only appends the tag).

---

## 6. MCP + agent-mcp schema updates

Both `mcp/index.ts` and `agent-mcp/index.ts` share the same tool registry, so changes land once in `supabase/functions/_shared/mcp-tools/`.

### `propose_scheduled_post` — add optional fields

```
media_type: z.enum(["image","video"]).default("image")
video_url: z.string().url().optional()
platform_metadata: z.record(z.any()).optional()
```

Validation added in the handler:

- If `platform === "youtube"`: require `media_type="video"`, `video_url`, `platform_metadata.youtube.title` (≤100), `platform_metadata.youtube.description` (≤5000, if present), `platform_metadata.youtube.privacyStatus` in the allowed set, default `categoryId="20"` (Gaming) if omitted.
- If `platform === "youtube"` and tenant has no active `youtube` `social_connections` row: reject with `tool_error` `no_youtube_connection` (so the agent surfaces a clear message rather than dumping a broken draft).

`update_scheduled_post` mirrors the same optional fields with the same validators applied when `platform` / `media_type` resolve to youtube/video.

### `list_tenants` `connected_platforms` field already surfaces YouTube automatically once a row exists — no schema change needed there.

### Agent prompt guidance (Darcy authors the actual copy)

Content the prompt must convey (not written here):

- YouTube is only proposable when the tenant's `connected_platforms` from `list_tenants` includes `"youtube"`.
- Every YouTube proposal requires `media_type="video"`, a `video_url` from `attach_tenant_asset_draft` (video variant), and a `platform_metadata.youtube` object with at minimum `title` (≤100 chars) and `privacyStatus` (`unlisted` during rehearsal, `public` for live).
- Field limits: title ≤100, description ≤5000, tags total ≤500 chars joined.
- If a proposal is deferred by quota, the agent should not resubmit — the dispatcher handles rescheduling.

---

## 7. Verification plan (all against Acme test channel, `privacyStatus=unlisted`)

V1 — **Google prerequisites present.** Secrets `YOUTUBE_OAUTH_CLIENT_ID/SECRET` set, `youtube_enabled=true` toggled on for the verification window only.

V2 — **Connect flow.** Tenant admin clicks Connect with Google, completes consent, is redirected back, sees YouTube listed in Social Accounts with the correct channel title. `social_connections` row has non-null `refresh_token`, `token_expires_at ≈ now+1h`, `provider_account_id`, `scopes` contains both scopes.

V3 — **Refresh worker.** Manually update the test row `token_expires_at = now() + interval '5 minutes'`, invoke `refresh-social-tokens`, confirm `access_token` changed and `token_expires_at` extended ~1h. Repeat with a deliberately corrupted `refresh_token` and confirm `oauth_error` populated, `is_active=false`, notification enqueued.

V4 — **Propose (agent path).** Runner-token MCP call to `propose_scheduled_post` with `platform="youtube"`, `media_type="video"`, `video_url`, `platform_metadata.youtube={title,description,privacyStatus:"unlisted"}`. Row lands in `pending_review`. Confirm rejection cases: missing `video_url`, oversized title, no youtube connection.

V5 — **Approve + dispatch.** Tenant admin approves the draft (`pending_review → pending`), cron dispatcher picks it up, resumable upload completes, `post_url` populated with `youtube.com/watch?v=…`, video visible on the test channel as **unlisted**. `youtube_publish_quota.uploads_count` = 1.

V6 — **Quota deferral.** Set `youtube_daily_cap=1` temporarily, propose+approve a second post, confirm it is rescheduled to next day 09:00, status back to `pending`, notification enqueued to admins/managers, no failed row. Restore cap to 5.

V7 — **Undeliverable precheck.** Force a row with `media_type='image'` and `platform='youtube'`; confirm dispatcher marks it undeliverable with reason `youtube_requires_video` and notifies.

V8 — **Regression: Facebook + Instagram.** Existing scheduled FB and IG posts from the Acme rehearsal set publish unchanged, no new columns break existing dispatcher code paths, `platform_metadata` defaults to `{}` and is ignored.

V9 — **Auth surfaces.** OAuth-authenticated `list_tenants` and `propose_scheduled_post` still succeed; runner-token path still succeeds; shapes unchanged for non-YouTube platforms.

V10 — **Kill switch.** Flip `youtube_enabled=false`, confirm Connect button hides, existing pending YouTube rows fall to undeliverable `youtube_disabled`, no other platform affected.

---

## Out of scope for this plan

- LinkedIn and X proper OAuth builds (worker is generic so those slot in later without re-architecting).
- YouTube analytics ingestion.
- Longform (non-Shorts) editor UI for video assets — first release uses `video_url` from Media Library uploads only.
- Google quota-increase application (Darcy tracks separately once verification lands).
