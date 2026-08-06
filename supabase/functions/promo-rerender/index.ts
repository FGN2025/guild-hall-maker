// ONE-OFF: re-render the Acme August 2026 calendar-lane promos with the
// current composer (title normalization + resolver + per-beat composition).
// Guarded to a single tenant + a single campaign title suffix, resumable via
// `max_posts`, and deleted once the lane work closes.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { composePromoLayout } from "./promo/composePromoLayout.ts";
import { renderPromoSceneToPng } from "./promo/renderPromo.ts";
import { resolveEventArt } from "./promo/resolveEventArt.ts";

const TENANT_ID = "41a2e493-079a-4a17-a3a9-aebdd5fe5f81";
const TITLE_SUFFIX = "-- August Seed";
const BUCKET = "tenant-marketing";
const TAG = "rerender-2026-08";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.headers.get("x-rerender-confirm") !== "rerender-august-2026") {
    return json({ error: "forbidden" }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const maxPosts: number = Math.max(1, Math.min(6, Number(body.max_posts ?? 3)));

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: tenant } = await svc
    .from("tenants").select("name, primary_color, accent_color").eq("id", TENANT_ID).maybeSingle();

  const { data: campaigns, error: cErr } = await svc
    .from("marketing_campaigns")
    .select("id, title, source_tournament_id, source_event_id, created_by")
    .eq("tenant_id", TENANT_ID)
    .like("title", `%${TITLE_SUFFIX}`);
  if (cErr) return json({ error: cErr.message }, 500);

  const byId = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const { data: posts, error: pErr } = await svc
    .from("scheduled_posts")
    .select("id, campaign_id, scheduled_at, image_url, caption")
    .in("campaign_id", [...byId.keys()])
    .order("scheduled_at", { ascending: true });
  if (pErr) return json({ error: pErr.message }, 500);

  const todo = (posts ?? []).filter((p) => !(p.image_url ?? "").includes(TAG));
  const slice = todo.slice(0, maxPosts);

  const results: any[] = [];

  for (const post of slice) {
    const camp = byId.get(post.campaign_id)!;
    try {
      let evt: any = null;
      if (camp.source_tournament_id) {
        const { data } = await svc.from("tournaments")
          .select("id, name, game, start_date, prize_pool, prize_type, image_url")
          .eq("id", camp.source_tournament_id).maybeSingle();
        evt = data;
      } else if (camp.source_event_id) {
        const { data } = await svc.from("tenant_events")
          .select("id, name, game, start_date, prize_pool, prize_type, image_url")
          .eq("id", camp.source_event_id).maybeSingle();
        evt = data;
      }
      if (!evt) { results.push({ post_id: post.id, skipped: "no_source_event" }); continue; }

      // Per-beat: day-of when the post lands on the event's calendar day.
      const day = (s: string) => new Date(s).toISOString().slice(0, 10);
      const beat = evt.start_date && day(post.scheduled_at) === day(evt.start_date) ? "Day-Of" : "Announce";

      const scene = composePromoLayout({
        event: {
          name: evt.name,
          game: evt.game ?? null,
          start_date: evt.start_date ?? null,
          prize_pool: evt.prize_pool ?? null,
          prize_type: evt.prize_type ?? null,
        },
        tenantName: (tenant as any)?.name ?? null,
        tenantPrimaryColor: (tenant as any)?.primary_color ?? null,
        tenantAccentColor: (tenant as any)?.accent_color ?? null,
        format: "portrait",
        beatLabel: beat,
      });

      const art = await resolveEventArt(
        { image_url: evt.image_url ?? null, game: evt.game ?? null, name: evt.name },
        svc as any,
      );
      scene.backgroundUrl = art.url;

      const png = await renderPromoSceneToPng(scene);
      const platePng = await renderPromoSceneToPng(scene, { includeText: false });

      const slug = beat.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const uuid = crypto.randomUUID();
      const base = `${TENANT_ID}/agent/2026/08/${TAG}-promo-${evt.id}-${slug}-${uuid}`;
      const path = `${base}.png`;
      const platePath = `${base}-plate.png`;

      for (const [p, bytes] of [[path, png], [platePath, platePng]] as const) {
        const { error } = await svc.storage.from(BUCKET).upload(p as string, bytes as Uint8Array, {
          contentType: "image/png", upsert: true,
        });
        if (error) throw error;
      }
      const ttl = 60 * 60 * 24 * 365;
      const sign = async (p: string) => {
        const { data, error } = await svc.storage.from(BUCKET).createSignedUrl(p, ttl);
        if (error || !data?.signedUrl) throw error;
        return data.signedUrl;
      };
      const url = await sign(path);
      const plateUrl = await sign(platePath);

      const { data: asset, error: aErr } = await svc.from("tenant_marketing_assets").insert({
        tenant_id: TENANT_ID,
        campaign_id: camp.id,
        file_name: `${scene.titleNormalization.output} — ${beat}.png`,
        file_path: path,
        url,
        background_url: plateUrl,
        label: `Portrait ${scene.width}x${scene.height}`,
        is_published: false,
        agent_source: "calendar-lane-rerender",
        created_by: (camp as any).created_by,
        proposed_by: (camp as any).created_by,
        notes: [
          `Beat: ${beat}`,
          `Art: ${art.provenance}${art.matchedGameName ? ` (${art.matchedGameName}, ${art.matchMethod})` : ""}`,
          `Title: ${scene.titleNormalization.log}`,
          TAG,
        ].join(" · "),
      }).select("id").single();
      if (aErr) throw aErr;

      const { error: uErr } = await svc.from("scheduled_posts")
        .update({ image_url: url }).eq("id", post.id);
      if (uErr) throw uErr;

      results.push({
        post_id: post.id,
        campaign: camp.title,
        event: evt.name,
        beat,
        rung: art.provenance,
        art_log: art.log,
        title_in: evt.name,
        title_out: scene.titleNormalization.output,
        title_log: scene.titleNormalization.log,
        asset_id: asset.id,
        path,
      });
    } catch (err) {
      results.push({ post_id: post.id, error: String((err as Error)?.message ?? err) });
    }
  }

  return json({
    tenant: (tenant as any)?.name,
    campaigns: byId.size,
    posts_total: posts?.length ?? 0,
    posts_remaining_before: todo.length,
    processed: results.length,
    posts_remaining_after: todo.length - results.filter((r) => r.asset_id).length,
    results,
  });
});
