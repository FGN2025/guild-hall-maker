

## Assessment: Media Uploads for Supplemental Player Guides

### Current State

The three standalone guide pages (`/guide/tournaments`, `/guide/challenges`, `/guide/quests`) **do not exist yet** — they were planned but never implemented. The existing `PlayerGuide.tsx` is a single-page static guide with hardcoded accordion sections. There is no admin-editable content or media attachment system for any guide.

### What "Upload files, images and videos" Requires

To make guide content enrichable with media, we need:

1. **A content storage model** — A database table to store guide media (which guide, ordering, captions, file URLs)
2. **An admin interface** — A way for admins/moderators to upload and arrange media within each guide section
3. **A player-facing renderer** — The guide pages display uploaded media inline within sections

### Proposed Architecture

**Database: `guide_media` table**

| Column | Type | Purpose |
|---|---|---|
| id | uuid PK | |
| guide_slug | text | `tournaments`, `challenges`, `quests` |
| section_id | text | Matches accordion section ID |
| file_url | text | Public URL from `app-media` storage |
| file_type | text | `image`, `video`, `file` |
| caption | text | Optional description |
| sort_order | integer | Display order within section |
| created_at | timestamptz | |

RLS: Public SELECT (guides are public content), admin/moderator INSERT/UPDATE/DELETE.

**Implementation Steps**

| Step | Effort | Description |
|---|---|---|
| 1. Create the 3 guide pages | ~2 hours | Port static content from PlayerGuide sections into dedicated pages with expanded detail |
| 2. Database migration | ~15 min | `guide_media` table + RLS |
| 3. `useGuideMedia` hook | ~30 min | Fetch media by guide slug; upload/delete mutations using `app-media` bucket |
| 4. Admin upload UI | ~1.5 hours | Section in admin settings or inline edit mode on guide pages — pick section, upload file, set caption, reorder |
| 5. Guide renderer | ~1 hour | Each accordion section queries its media and renders images/videos/download links inline |
| 6. Testing | ~30 min | Upload flow, display, ordering, delete |

**Total estimate: ~6 hours**

### Dependencies

- The 3 guide pages must be created first (Step 1)
- The existing `app-media` storage bucket (public) handles file storage — no new bucket needed
- The existing `MediaUploader` component pattern can be reused for the admin upload UI

### Recommendation

Build this in two phases:
1. **Phase 1**: Create the 3 static guide pages (approved plan already exists)
2. **Phase 2**: Add the `guide_media` table and admin upload capability

This keeps each phase reviewable and deployable independently.

