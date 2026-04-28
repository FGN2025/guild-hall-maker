# FGN Brand Guide — Implementation Plan

Based on your decisions:
1. **Both name expansions are valid, audience-specific:** "Fiber Gaming Network" for the player app (play.fgn.gg), "Federated Generative Network" for the marketing/business site (fgn.business).
2. **Player app gains an optional light "Enterprise mode"** for embedding in provider portals.
3. **CTA colors locked per property:** violet on marketing, cyan on the app.

---

## Master Palette (single source of truth, both properties)

| Token | Role | HEX | HSL |
|---|---|---|---|
| `fgn.ink` | Dark surface | `#0B0F14` | `216 28% 6%` |
| `fgn.cloud` | Light surface | `#F6F8FB` | `214 27% 97%` |
| `fgn.cyan` | Play pillar / **app primary CTA** | `#00D4D4` | `180 100% 42%` |
| `fgn.violet` | Performance pillar / **marketing primary CTA** | `#7C3AED` | `262 83% 58%` |
| `fgn.azure` | Fiber/Network | `#2E8BFF` | `214 100% 59%` |
| `fgn.amber` | Pathways pillar | `#F59E0B` | `38 92% 50%` |

Pillar locks (never change, on either site):
Performance → Violet · Play → Cyan · Pathways → Amber · Fiber → Azure.

---

## Changes to make in this repo

### 1. `BRAND.md` (new, root)
Single-page brand guide capturing palette, pillar locks, typography rules, logo + naming rules ("Fiber Gaming Network" for app, "Federated Generative Network" for marketing), and the arcade-vs-enterprise mode definition. This is the artifact you can hand to the fgn.business team.

### 2. `src/index.css` — retune tokens to master palette
- Update `:root` (arcade/dark) primary from `180 100% 45%` → `180 100% 42%` (cyan exact match).
- Update `:root` accent from `280 80% 55%` → `262 83% 58%` (violet exact match).
- Background from `220 20% 4%` → `216 28% 6%` (ink exact match).
- Add four pillar tokens used by both modes:
  ```
  --brand-pillar-perf:  262 83% 58%;
  --brand-pillar-play:  180 100% 42%;
  --brand-pillar-path:   38 92% 50%;
  --brand-pillar-fiber: 214 100% 59%;
  ```
- Refresh `.light` block to be the **Enterprise mode** spec: `fgn.cloud` background, **violet primary**, cyan demoted to accent, no neon glow utilities (already gated by `:is(.light)`).

### 3. `tailwind.config.ts` — expose pillar colors
Add a `brand` color group so components can write `text-brand-perf`, `bg-brand-play/10`, etc.:
```ts
brand: {
  perf:  "hsl(var(--brand-pillar-perf))",
  play:  "hsl(var(--brand-pillar-play))",
  path:  "hsl(var(--brand-pillar-path))",
  fiber: "hsl(var(--brand-pillar-fiber))",
}
```

### 4. Enterprise mode for embedding (`?mode=enterprise`)
Small addition to `src/main.tsx` (or a new `BrandModeProvider` mounted in `App.tsx`):
- On boot, if URL has `?mode=enterprise` **or** the page is inside an `<iframe>` whose parent origin is on an allowlist (provider portals), force `next-themes` to `light` and add a `enterprise` class to `<html>`.
- The `enterprise` class scopes overrides in `index.css` to swap the **primary CTA from cyan to violet** (`--primary: 262 83% 58%`) so the embed matches marketing.
- Persist the choice in `localStorage` so deep navigation inside the iframe stays in enterprise mode.
- No change to `ThemeToggle.tsx` behaviour for normal users — enterprise mode is opt-in via URL/embed only.

### 5. Hero & Navbar copy alignment
- `src/components/HeroSection.tsx`: keep "Fiber Gaming Network" alt text (correct for app audience). No visual change required — the existing cyan + violet gradient already maps to the new tokens once `index.css` is retuned.
- `src/components/Navbar.tsx`: no copy change. The "Powered by FGN" subline stays.

### 6. Memory updates
- Add `mem://style/brand-guide` summarizing palette + pillar locks + the audience-specific naming rule.
- Update Core line in `mem://index.md` to reference the locked palette and the two-mode system (arcade/enterprise) so future edits don't drift.

---

## Out of scope (intentionally)
- Redesign of fgn.business — we only **publish** the palette so they can align next; we do not edit that codebase here.
- Changing the player app's default look. Arcade mode stays the default; enterprise mode is opt-in via embed.
- Font swap. Orbitron/Rajdhani/Inter stack stays; enterprise mode just down-weights Orbitron via existing `:is(.light)` rules already in `index.css` (no new font work needed now).

---

## Acceptance check after build
- Visual: hero, primary buttons, and nav links on `/` and `/dashboard` look unchanged (numerically tiny color shift only).
- Pillar usage: a quick grep should show no hard-coded pillar hexes — components use `text-brand-*` / `bg-brand-*` tokens going forward (existing usages can be migrated opportunistically, not in a sweep).
- Enterprise embed: visiting `/?mode=enterprise` renders with `fgn.cloud` background and **violet** primary buttons; refreshing keeps the mode.
- `BRAND.md` exists at repo root and is linkable.
