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

  // Renders a plate-rung exemplar (art resolution forced to miss) so reviewers
  // can spot-check the fallback even in a month where every event matched art.
  if (body.action === "plate_demo") {
    const { data: t } = await svc.from("tournaments")
      .select("id, name, game, start_date, prize_pool, prize_type")
      .eq("id", body.tournament_id).maybeSingle();
    if (!t) return json({ error: "tournament not found" }, 404);
    const { data: tn } = await svc.from("tenants")
      .select("name, primary_color, accent_color").eq("id", TENANT_ID).maybeSingle();
    const scene = composePromoLayout({
      event: {
        name: t.name, game: t.game ?? null, start_date: t.start_date ?? null,
        prize_pool: t.prize_pool ?? null, prize_type: t.prize_type ?? null,
      },
      tenantName: (tn as any)?.name ?? null,
      tenantPrimaryColor: (tn as any)?.primary_color ?? null,
      tenantAccentColor: (tn as any)?.accent_color ?? null,
      format: "portrait",
      beatLabel: body.beat_label ?? "Announce",
    });
    scene.backgroundUrl = null; // force the plate rung
    const png = await renderPromoSceneToPng(scene);
    const p = `${TENANT_ID}/spotcheck/plate-exemplar-${t.id}.png`;
    const up = await svc.storage.from(BUCKET).upload(p, png, { contentType: "image/png", upsert: true });
    if (up.error) return json({ error: up.error.message }, 500);
    const { data: s } = await svc.storage.from(BUCKET).createSignedUrl(p, 60 * 60 * 24 * 7);
    return json({ path: p, url: s?.signedUrl, title: scene.titleNormalization });
  }

  // --- housekeeping actions -------------------------------------------------

  // Purge storage objects under the tenant's agent prefix that no
  // tenant_marketing_assets row and no scheduled_posts row references.
  // Dry-run by default; pass {"action":"purge_orphans","apply":true} to delete.
  if (body.action === "purge_orphans") {
    const prefix = `${TENANT_ID}/agent/2026/08`;
    const { data: objs, error: lErr } = await svc.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (lErr) return json({ error: lErr.message }, 500);
    const names = (objs ?? []).filter((o) => o.id !== null).map((o) => `${prefix}/${o.name}`);

    const { data: assets } = await svc.from("tenant_marketing_assets")
      .select("file_path, background_url").eq("tenant_id", TENANT_ID);
    const { data: posts } = await svc.from("scheduled_posts")
      .select("image_path, image_url").eq("tenant_id", TENANT_ID);

    const referenced = new Set<string>();
    for (const a of assets ?? []) {
      if (a.file_path) referenced.add(a.file_path);
      const m = (a.background_url ?? "").match(/tenant-marketing\/([^?]+)/);
      if (m) referenced.add(decodeURIComponent(m[1]));
    }
    for (const p of posts ?? []) {
      if ((p as any).image_path) referenced.add((p as any).image_path);
      const m = ((p as any).image_url ?? "").match(/tenant-marketing\/([^?]+)/);
      if (m) referenced.add(decodeURIComponent(m[1]));
    }

    const orphans = names.filter((n) => !referenced.has(n));
    let removed: string[] = [];
    if (body.apply === true && orphans.length) {
      const { error } = await svc.storage.from(BUCKET).remove(orphans);
      if (error) return json({ error: error.message, orphans }, 500);
      removed = orphans;
    }
    return json({
      prefix,
      objects_listed: names.length,
      referenced: referenced.size,
      orphans_found: orphans.length,
      orphans,
      applied: body.apply === true,
      removed: removed.length,
    });
  }


  if (body.action === "cleanup") {
    const report: Record<string, unknown> = {};

    // 1. Design-sample objects (all versions) under the tenant prefix.
    const prefix = `${TENANT_ID}/design-samples`;
    const { data: samples } = await svc.storage.from(BUCKET).list(prefix, { limit: 1000 });
    const sampleNames = (samples ?? []).map((f) => `${prefix}/${f.name}`);
    // nested version folders (v1/v2/v3)
    for (const f of samples ?? []) {
      if (f.id === null) {
        const { data: inner } = await svc.storage.from(BUCKET).list(`${prefix}/${f.name}`, { limit: 1000 });
        for (const g of inner ?? []) sampleNames.push(`${prefix}/${f.name}/${g.name}`);
      }
    }
    const toRemove = sampleNames.filter((n) => !n.endsWith("/.emptyFolderPlaceholder"));
    if (toRemove.length) await svc.storage.from(BUCKET).remove(toRemove);
    report.design_samples_removed = toRemove;

    // 2. Superseded seed-run assets on the August Seed campaigns.
    const { data: camps } = await svc.from("marketing_campaigns")
      .select("id").eq("tenant_id", TENANT_ID).like("title", `%${TITLE_SUFFIX}`);
    const ids = (camps ?? []).map((c) => c.id);
    const { data: old } = await svc.from("tenant_marketing_assets")
      .select("id, file_path, background_url")
      .in("campaign_id", ids).eq("agent_source", "claude-mcp");
    const paths: string[] = [];
    for (const a of old ?? []) {
      if (a.file_path) paths.push(a.file_path);
      const m = (a.background_url ?? "").match(/tenant-marketing\/([^?]+)/);
      if (m) paths.push(decodeURIComponent(m[1]));
    }
    if (paths.length) await svc.storage.from(BUCKET).remove(paths);
    if (old?.length) {
      await svc.from("tenant_marketing_assets").delete().in("id", old.map((a) => a.id));
    }
    report.superseded_assets_deleted = old?.length ?? 0;
    report.superseded_objects_removed = paths.length;
    return json(report);
  }


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

      const slug = beat.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const uuid = crypto.randomUUID();
      const base = `${TENANT_ID}/agent/2026/08/${TAG}-promo-${evt.id}-${slug}-${uuid}`;
      const path = `${base}.png`;

      {
        const { error } = await svc.storage.from(BUCKET).upload(path, png, {
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
      const plateUrl = null;


      const { data: asset, error: aErr } = await svc.from("tenant_marketing_assets").insert({
        tenant_id: TENANT_ID,
        campaign_id: camp.id,
        file_name: `${scene.titleNormalization.after} — ${beat}.png`,
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
        title_out: scene.titleNormalization.after,
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
