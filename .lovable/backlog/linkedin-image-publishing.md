# LinkedIn publishing — image posts must not be link-based

Finding (2026-08-11, not in play today: LinkedIn is not built).

The LinkedIn share shape currently sketched uses
`shareMediaCategory: "ARTICLE"` with `originalUrl` pointing at the storage
object. That is a *link* post: LinkedIn stores the URL and re-fetches it for
rendering, so when the signed URL expires (1h TTL) the post rots — the preview
goes blank on an already-published post.

Correct shape: `shareMediaCategory: "IMAGE"` with the binary uploaded through
the LinkedIn Assets API (`registerUpload` -> PUT bytes -> reference the returned
`asset:` URN). LinkedIn then holds its own copy, the same way Facebook does.

Do this when LinkedIn publishing is implemented in
`supabase/functions/publish-scheduled-posts/index.ts`.
