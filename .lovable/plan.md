

## P0: Make Third-Party Embeds Actually Work

### Problem
`SectionPreview` and `WebPageView` render `embed_code` via `dangerouslySetInnerHTML`. Browsers treat `<script>` tags injected this way as **inert** — they never execute. So when a tenant pastes a CommonNinja, Twitter, TikTok, or X widget snippet into an `embed_widget` section, the loader script never fires and the widget container stays empty.

The homepage `TickerEmbed.tsx` already solved this for one specific case (CommonNinja SDK) but that logic isn't reusable.

### Solution
Build a reusable `<EmbeddedHtml />` component that:
1. Renders the HTML into a container
2. Walks the DOM, finds every `<script>` tag, clones it into a real DOM script node, and appends it (this is the standard pattern that forces browser execution)
3. Preserves `src`, `type`, `async`, `defer`, and inline script content
4. Cleans up on unmount

Use it everywhere embed HTML is rendered.

### Files to change

**New**
- `src/components/shared/EmbeddedHtml.tsx` — reusable script-rehydrating embed renderer

**Modified**
- `src/components/webpages/SectionPreview.tsx` — replace `dangerouslySetInnerHTML` in the `embed_widget` case with `<EmbeddedHtml html={c.embed_code} />`
- `src/components/TickerEmbed.tsx` — refactor to use `<EmbeddedHtml />` (removes the duplicated CommonNinja-specific logic)
- `src/lib/exportWebPage.ts` — fix the standalone HTML export so embed scripts come through intact (currently `esc()` would break script content if applied; verify embed_code is passed through raw with a comment noting tenant-trusted source)

### How it works (technical)

```text
<EmbeddedHtml html={...}>
   │
   ▼
1. useRef container <div>
2. useEffect:
     container.innerHTML = html      // injects markup
     for each <script> in container:
        create new <script> element
        copy attributes (src, type, async, defer)
        copy text content
        replace original with new node
        → browser sees a fresh script, executes it
3. cleanup: container.innerHTML = ''
```

This is the well-known "script rehydration" trick used by every framework that renders third-party HTML.

### Trust & safety note
Embed code is authored only by tenant staff (RLS protected) — same trust boundary as today. No new XSS surface introduced; we're just letting already-saved scripts execute as intended. Sandbox toggle is **out of scope for P0** (deferred to P1).

### Test plan
1. Open the preview (already on `/community`); navigate to **Tenant → Web Pages**.
2. Open or create a page, add an **Embed Widget** section.
3. Paste a CommonNinja snippet (copy from homepage `homepage_ticker_embed` setting or a fresh widget). Save.
4. Switch to Preview tab → confirm the widget renders.
5. Open `/pages/{tenantSlug}/{pageSlug}` (Published view) → confirm the widget renders.
6. Visit `/` (homepage) → confirm `TickerEmbed` still works after refactor.
7. Check console for script errors.

