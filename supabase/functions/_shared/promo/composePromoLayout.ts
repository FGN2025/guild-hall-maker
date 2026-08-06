// Single source of truth lives in src/lib/promo/composePromoLayout.ts.
// This module previously held a hand-synced duplicate, which drifted; it is now
// a pure re-export so the client canvas render and the server SVG render can
// never disagree on layout.
export * from "../../../../src/lib/promo/composePromoLayout.ts";
