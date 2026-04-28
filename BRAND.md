# FGN Brand Guide

Single source of truth for the FGN visual identity across both properties:

- **play.fgn.gg** — the player platform (this repo). Audience: subscribers, gamers, students.
- **fgn.business** — the marketing/business site. Audience: broadband providers, partners, workforce boards.

---

## 1. Naming

| Where | Expansion | Use |
|---|---|---|
| Player platform (play.fgn.gg) | **Fiber Gaming Network** | All player-facing copy, footers, alt text |
| Marketing site (fgn.business) | **Federated Generative Network** | Provider/enterprise copy, investor decks |
| Anywhere else | **FGN** | Stand-alone wordmark; do not expand if audience is mixed |

The three-letter mark **FGN** is identical on both properties. Only the long-form expansion changes by audience.

---

## 2. Master Palette

Both properties draw from the same six hex values. Only the *surface* and *which accent is primary CTA* change between modes.

| Token | Role | HEX | HSL |
|---|---|---|---|
| `fgn.ink` | Dark surface | `#0B0F14` | `216 28% 6%` |
| `fgn.cloud` | Light surface | `#F6F8FB` | `214 27% 97%` |
| `fgn.cyan` | Play pillar / **app primary CTA** | `#00D4D4` | `180 100% 42%` |
| `fgn.violet` | Performance pillar / **marketing primary CTA** | `#7C3AED` | `262 83% 58%` |
| `fgn.azure` | Fiber / network infrastructure | `#2E8BFF` | `214 100% 59%` |
| `fgn.amber` | Pathways pillar | `#F59E0B` | `38 92% 50%` |

Supporting neutrals (shared): success `#22C55E`, danger `#EF4444`, muted text `#94A3B8`.

### Pillar Locks (never change, on either site)

| Pillar | Color | Token |
|---|---|---|
| Performance | Violet | `--brand-pillar-perf` |
| Play | Cyan | `--brand-pillar-play` |
| Pathways | Amber | `--brand-pillar-path` |
| Fiber / Network | Azure | `--brand-pillar-fiber` |

This is the single most important rule: the same pillar gets the same color on every property, every chart, every badge.

---

## 3. Two Modes, One Palette

### Arcade Mode — `play.fgn.gg` default
- Surface: `fgn.ink`
- Primary CTA: **cyan**
- Secondary: violet
- Display: Orbitron 700–900
- Headings: Rajdhani 600
- Body: Inter
- Effects: neon glow, particle network, glassmorphism
- Toggle: `<html class="dark">` (default)

### Enterprise Mode — `fgn.business` default, also opt-in inside the app
- Surface: `fgn.cloud`
- Primary CTA: **violet**
- Secondary: cyan
- Display/Headings: Inter 600–700 (no Orbitron)
- Body: Inter 400–500
- Effects: soft elevation shadows, no neon
- Toggle in this app: add `?mode=enterprise` to any URL, or open inside an iframe — sets `<html class="light enterprise">` and persists in `localStorage` under `fgn-brand-mode`.

Use enterprise mode whenever the player app is embedded inside a provider portal or shown to a non-gaming audience.

---

## 4. Typography

| Use | Arcade (app) | Enterprise (marketing / embed) |
|---|---|---|
| Display / hero | Orbitron 700–900 | Inter / Plus Jakarta 700 |
| Headings (h2–h4) | Rajdhani 600 | Inter 600 |
| Body | Inter 400–500 | Inter 400 |
| Numeric / stats | Rajdhani tabular | Inter tabular |

Orbitron is **exclusive to the player platform**. Do not introduce it on fgn.business.

---

## 5. Logo

- **Wordmark:** the "FGN" stacked-circuit mark already used on both properties is the master logo.
- On dark surfaces: white mark.
- On light surfaces: `fgn.ink` mark.
- **Never** recolor the mark to an accent color.
- Minimum clear space: 1× the height of the "G" on all sides.

---

## 6. Component Tokens (cross-site)

```text
--brand-primary       → cyan in app, violet on marketing/enterprise
--brand-secondary     → violet in app, cyan on marketing/enterprise
--brand-pillar-perf   → violet  (always)
--brand-pillar-play   → cyan    (always)
--brand-pillar-path   → amber   (always)
--brand-pillar-fiber  → azure   (always)
--surface-base        → ink (arcade) / cloud (enterprise)
--radius-card         → 12px
--radius-button       → 10px
--shadow-glow         → arcade only
--shadow-elevation    → enterprise only
```

Tailwind exposes the pillars as `text-brand-perf`, `bg-brand-play/10`, `border-brand-amber`, etc.

When a tenant white-labels the app, only `--brand-primary` and `--brand-secondary` get overridden — pillar colors stay locked so cross-property charts remain readable.

---

## 7. Imagery & Motion

- **Marketing:** soft gradient meshes, subtle line-network backgrounds, white cards with 8% slate shadow.
- **App:** particle networks (`ParticlesBackground.tsx`), grid overlay, neon underglow on cards.
- Both: avoid stock esports photography; prefer abstract network/light imagery so the brand reads as *infrastructure that powers play*, not *a gaming clan*.

---

## 8. For the fgn.business team

To align the marketing site with this guide:

1. Adopt the six master hex values verbatim. Do not introduce new accents.
2. Lock pillar colors per the table in §2 (Performance=violet, Play=cyan, Pathways=amber, Fiber=azure).
3. Keep violet as the marketing primary CTA. Cyan stays the Play pillar accent only.
4. Do not adopt Orbitron — keep Inter / geometric sans.
5. Use "Federated Generative Network" only when the long form is needed; default to "FGN".
