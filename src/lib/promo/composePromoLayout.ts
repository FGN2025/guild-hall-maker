// SINGLE SOURCE: supabase/functions/_shared/promo/composePromoLayout.ts
//
// The real module now lives under supabase/functions/_shared so the Supabase
// edge bundler can compile it (it cannot reach out of supabase/functions into
// src/). Vite has no such restriction, so the browser canvas render imports it
// through this re-export. Do NOT copy the layout back here — one source only.
export * from "../../../supabase/functions/_shared/promo/composePromoLayout";
