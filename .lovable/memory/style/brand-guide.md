---
name: brand-guide
description: FGN master palette (cyan/violet/azure/amber on ink/cloud), pillar locks, audience-specific naming, and arcade vs enterprise mode rules. See BRAND.md.
type: design
---
Master palette (HSL), shared by play.fgn.gg and fgn.business:
- ink #0B0F14 (216 28% 6%) — dark surface
- cloud #F6F8FB (214 27% 97%) — light surface
- cyan #00D4D4 (180 100% 42%) — Play pillar, ARCADE primary CTA
- violet #7C3AED (262 83% 58%) — Performance pillar, ENTERPRISE primary CTA
- azure #2E8BFF (214 100% 59%) — Fiber/Network
- amber #F59E0B (38 92% 50%) — Pathways pillar

Pillar locks (never change): Performance=violet, Play=cyan, Pathways=amber, Fiber=azure. Tailwind tokens: `text-brand-perf|play|path|fiber`.

Two modes share the palette:
- Arcade mode = `<html class="dark">`, cyan primary, Orbitron+Rajdhani+Inter, neon glow. Default for play.fgn.gg.
- Enterprise mode = `<html class="light enterprise">`, violet primary, Inter only, no neon. Activates via `?mode=enterprise`, when embedded in iframe, or `localStorage.fgn-brand-mode === "enterprise"`. Bootstrapped in `src/lib/brandMode.ts` before React mounts.

Naming: "Fiber Gaming Network" = player app long-form. "Federated Generative Network" = marketing long-form. Wordmark "FGN" identical on both. Never recolor the FGN mark.

Tenant white-label only overrides `--brand-primary`/`--brand-secondary`; pillar tokens stay locked so cross-property charts stay readable.
