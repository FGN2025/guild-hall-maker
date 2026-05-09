# Performance Assessment & Improvement Plan

## What I measured (landing page `/`)

Pulled live metrics with the browser performance profiler:

| Metric | Value | Verdict |
|---|---|---|
| First Contentful Paint | **9.99s** | Poor (target <1.8s) |
| DOM Content Loaded | **9.74s** | Poor |
| Cumulative Layout Shift | **0.187** (5 shifts) | Needs improvement (target <0.1) |
| Resources loaded | **166** (136 scripts) | Very high |
| Largest scripts | lucide-react 157KB, supabase 84KB, react-markdown 69KB | react-markdown should not be on landing |
| Slowest resource | YouTube iframe 1.68s, react-markdown 1.55s | Eager third-party + unused module |

The landing page itself is small, but it pays for: an eager particles engine, a YouTube iframe that mounts before the user scrolls, a Supabase round-trip for the hero logo (causing layout shift), and module graphs pulled in by the navbar.

## Top issues + fixes

### 1. CLS on hero (0.18)
The hero logo is fetched from Supabase **after** paint, then swapped in. The headline below it shifts down. Same for the apprenticeship section.

**Fix:** render the bundled `defaultLogo` immediately with explicit `width`/`height` (or `aspect-ratio`) and reserve space for the headline block. Move the Supabase fetch into a low-priority effect that only swaps if the cached URL differs. Add `width`/`height` to the apprenticeship `<img>` too.

### 2. Particles engine blocks first paint
`ParticlesBackground` eagerly imports `@tsparticles/react` + `loadSlim` on the hero. That's ~30–40KB parsed before anything visual.

**Fix:** lazy-load the component with `React.lazy` and only mount it when the browser is idle (reuse the `useDeferredMount` pattern already in `AppLayout`). Hide behind `prefers-reduced-motion` as well.

### 3. YouTube iframe loads on initial paint
`FeaturedVideo` mounts the `<iframe>` as soon as the video ID resolves — costs ~1.6s and pulls in YouTube's player JS.

**Fix:** render a lightweight thumbnail (`https://i.ytimg.com/vi/{id}/hqdefault.jpg`) with a play button overlay; swap to the real iframe on click ("facade" pattern). Optionally use `IntersectionObserver` to lazy-mount when scrolled near.

### 4. `FeaturedEvents` runs on landing
263-line component that hits Supabase before paint. Move it below the fold visually + lazy-import it (`React.lazy` with a `Suspense` skeleton) and only fetch when its section enters the viewport.

### 5. react-markdown leaks into landing bundle
Despite the deferred `CoachFloatingButton`, `react-markdown` shows up in the landing resource list. Likely an eager import in `Navbar` or a context. **Investigate** with a quick grep; either move the offending import behind a dynamic `import()` or split the chunk.

### 6. App-shell navigation feel
- Add a **persistent layout** between Index → /tournaments etc. so the navbar doesn't unmount/remount on first navigation (currently each route has its own layout wrapper).
- The `PageLoader` Suspense fallback flashes a full-screen spinner on every lazy route. Replace with a thin top-of-page progress bar (e.g. a 2-line component using `useNavigation`-style timer) so navigation feels instant.

### 7. Auth bootstrap blocks protected routes
`AuthContext` already caches roles in localStorage (good). Confirm we're rendering children optimistically while the background refresh runs, and that `ProtectedRoute` doesn't show a spinner when the cache exists. If it does, gate the spinner on "no cached session".

### 8. Image weight & format
Hero images are `.jpg`/`.png` from `src/assets`. Convert to AVIF/WebP variants and use `<picture>` with explicit dimensions. `fetchpriority="high"` on the LCP image (hero logo or background).

### 9. Font loading
Display fonts likely block paint. Add `font-display: swap` to every `@font-face` (check `index.css`) and preload only the weights used above the fold.

### 10. Misrouted route in `App.tsx`
`/admin/redemptions` is currently nested inside the moderator-routes block. Functionally fine but worth grouping it with the other admin routes for clarity (no perf impact, just hygiene found while auditing).

## Out of scope

- No backend/RLS changes.
- No design changes — visuals stay identical (particles still on, video still featured, hero copy unchanged).
- No package upgrades.

## Files likely touched

- `src/components/HeroSection.tsx` — reserve space, defer logo swap, image dimensions
- `src/components/ParticlesBackground.tsx` + `HeroSection.tsx` — lazy mount
- `src/components/FeaturedVideo.tsx` — thumbnail facade
- `src/pages/Index.tsx` — lazy-load `FeaturedEvents`, `FeaturedVideo`
- `src/components/Navbar.tsx` — purge any markdown import
- `src/App.tsx` — lighter Suspense fallback, route grouping
- `src/components/ProtectedRoute.tsx` — optimistic render with cached session
- `src/index.css` — `font-display: swap`, preload hints in `index.html`
- `vite.config.ts` — additional `manualChunks` if needed after audit

## Expected impact

- FCP: **9.9s → ~1.5–2.5s** in dev; production build should be sub-1s on broadband.
- CLS: **0.187 → <0.05** by reserving hero space.
- Initial scripts: drop ~150KB (particles + youtube + markdown) from the critical path.
- Navigation between top routes feels instant (no full-screen spinner flash).

Want me to proceed with all 10, or focus on the top 5 (CLS, particles, YouTube facade, FeaturedEvents lazy, react-markdown leak)?
