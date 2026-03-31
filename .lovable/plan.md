

## Add Video URL/Link Input to Evidence Upload Dialog

### Overview
Add a toggle between "Upload File" and "Paste Video Link" in the EvidenceUpload dialog. Players can either upload a file (existing behavior) or paste a YouTube/Twitch/video URL as evidence.

### Changes — `src/components/challenges/EvidenceUpload.tsx`

**Add input mode toggle** (Tabs or segmented buttons): "Upload File" | "Video Link"

**Video Link mode**:
- Show an `Input` field with placeholder "Paste YouTube, Twitch, or video URL..."
- Basic URL validation: must start with `https://` and match common video domains (youtube.com, youtu.be, twitch.tv, clips.twitch.tv) or any valid https URL
- On valid URL entry, set `uploadedUrl` to the pasted URL and `fileType` to `"video_link"`
- Show a small preview: extract YouTube thumbnail via `https://img.youtube.com/vi/{id}/hqdefault.jpg` for YouTube URLs, or show a link icon confirmation for others

**Upload File mode**: unchanged existing behavior

**Submit button**: enabled when either a file is uploaded OR a valid video URL is pasted. The `onSubmit` callback receives `fileType: "video_link"` for pasted URLs so downstream code can distinguish.

**Reset on close**: clear input mode, URL, and notes when dialog closes

### No database changes needed
The `challenge_evidence.file_url` column already stores a URL string — a YouTube/Twitch link works identically. The `file_type` column is `text` and can store `"video_link"` alongside existing `"image"`, `"video"`, `"file"` values.

### Files Changed

| File | Change |
|------|--------|
| `src/components/challenges/EvidenceUpload.tsx` | Add tab toggle, video URL input with validation, YouTube thumbnail preview |

