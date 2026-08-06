// TEMPORARY sample renderer for Darcy's design review of the type-scale and
// prize-label composer changes. Renders a fixed spread to a review/ prefix in
// the tenant-marketing bucket and returns signed URLs. Delete after the ruling.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { composePromoLayout, formatPrizeLabel, type PromoFormat } from "../_shared/promo/composePromoLayout.ts";
import { renderPromoSceneToPng } from "../_shared/promo/renderPromo.ts";
import { resolveEventArt } from "../_shared/promo/resolveEventArt.ts";

const BUCKET = "tenant-marketing";

type Case = {
  key: string;
  tournament_id?: string;
  format: PromoFormat;
  beat: string;
  overrideName?: string;
  overridePrizePool?: string | null;
  overridePrizeType?: string | null;
};

const CASES: Case[] = [
  // portrait, prize pool present -> "Prize Pool: 30 pts"
  { key: "01-portrait-prizepool", tournament_id: "5ad42203-e25e-4fc6-aac0-9e4d3378557e", format: "portrait", beat: "Announce" },
  // portrait, game night, prize_type none -> line omitted entirely
  { key: "02-portrait-gamenight-noprize", tournament_id: "726bdf43-9df9-48dc-a13b-bfec36ac656a", format: "portrait", beat: "Day-Of" },
  // square
  { key: "03-square-prizepool", tournament_id: "e0c3ce77-0665-40a9-8fa0-319e06adaf2e", format: "square", beat: "Announce" },
  // landscape
  { key: "04-landscape-prizepool", tournament_id: "7041c0ea-86dc-4f3b-8090-bb2c3a2e928f", format: "landscape", beat: "Day-Of" },
  // long title, portrait — worst case for the auto-fit floor and word wrap
  {
    key: "05-portrait-longtitle",
    tournament_id: "e0c3ce77-0665-40a9-8fa0-319e06adaf2e",
    format: "portrait",
    beat: "Announce",
    overrideName: "Acme Broadband Autumn Invitational Super Smash Bros Ultimate Doubles Championship Finals",
  },
  // explicit ZERO prize pool with prize_type value -> must omit, not print 0
  {
    key: "06-portrait-zero-prize",
    tournament_id: "f49755d2-b408-4272-bff7-3c045441a841",
    format: "portrait",
    beat: "Day-Of",
    overridePrizePool: "0",
    overridePrizeType: "value",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: tenant } = await supabase
      .from("tenants").select("id, name, primary_color, accent_color")
      .eq("slug", "acme-broadband").maybeSingle();

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const out: any[] = [];

    for (const c of CASES) {
      const { data: t } = await supabase
        .from("tournaments")
        .select("id, name, game, start_date, prize_pool, prize_type, image_url")
        .eq("id", c.tournament_id!).maybeSingle();
      if (!t) { out.push({ key: c.key, error: "tournament not found" }); continue; }

      const evt = {
        name: c.overrideName ?? t.name,
        game: t.game,
        start_date: t.start_date,
        prize_pool: c.overridePrizePool !== undefined ? c.overridePrizePool : t.prize_pool,
        prize_type: c.overridePrizeType !== undefined ? c.overridePrizeType : t.prize_type,
      };

      const scene = composePromoLayout({
        event: evt,
        tenantName: tenant?.name ?? null,
        tenantPrimaryColor: tenant?.primary_color ?? null,
        tenantAccentColor: tenant?.accent_color ?? null,
        format: c.format,
        beatLabel: c.beat,
      });
      const art = await resolveEventArt({ image_url: t.image_url, game: t.game, name: t.name }, supabase);
      scene.backgroundUrl = art.url;

      const png = await renderPromoSceneToPng(scene);
      const path = `${tenant!.id}/review/${stamp}/${c.key}.png`;
      const up = await supabase.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);

      const prizeText = scene.texts.find((x) => x.text.startsWith("Prize"))?.text ?? null;
      out.push({
        key: c.key,
        format: c.format,
        dims: `${scene.width}x${scene.height}`,
        title_after: scene.titleNormalization.after,
        title_lines: scene.texts.filter((x) => x.color === "#ffffff").map((x) => x.text),
        title_font_px: scene.texts.find((x) => x.color === "#ffffff")?.fontSize ?? null,
        beat_font_px: scene.texts[0]?.fontSize ?? null,
        prize_line: prizeText,
        prize_label_raw: formatPrizeLabel(evt.prize_pool, evt.prize_type),
        art_provenance: art.provenance,
        url: signed?.signedUrl ?? null,
      });
    }

    return new Response(JSON.stringify({ build: "2026-08-06T22:20Z-typescale-prizepool", cases: out }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
