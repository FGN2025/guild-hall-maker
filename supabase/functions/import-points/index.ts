import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Lowercase, strip leading @ and any legacy #1234 discriminator. */
const normalizeDiscord = (raw: unknown): string => {
  let v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "";
  v = v.replace(/^@+/, "");
  v = v.replace(/#\d{1,6}$/, "");
  return v.trim();
};

const parsePoints = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
};

interface InputRow {
  discord: string;
  points: unknown;
  row_number?: number;
}

type Reason = "ok" | "blank_discord" | "invalid_points" | "no_match" | "ambiguous" | "duplicate_discord";

interface ResolvedRow {
  row_number: number;
  discord: string;
  normalized: string;
  points: number | null;
  user_id: string | null;
  display_name: string | null;
  matched_via: "profile" | "legacy" | null;
  current_points: number;
  current_available: number;
  reason: Reason;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supa.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Platform admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "preview";

    // ---------------------------------------------------------------- rollback
    if (action === "rollback") {
      const batchId: string = body.batch_id;
      if (!batchId) return json({ error: "batch_id required" }, 400);

      const { data: adjustments, error: adjErr } = await admin
        .from("point_adjustments")
        .select("id, user_id, season_id, points_change")
        .eq("import_batch_id", batchId);
      if (adjErr) return json({ error: adjErr.message }, 500);
      if (!adjustments?.length) return json({ error: "No adjustments found for that batch" }, 404);

      let reverted = 0;
      for (const a of adjustments) {
        const { data: score } = await admin
          .from("season_scores")
          .select("id, points, points_available")
          .eq("season_id", a.season_id)
          .eq("user_id", a.user_id)
          .maybeSingle();
        if (!score) continue;
        await admin.from("season_scores").update({
          points: Math.max(0, (score.points ?? 0) - a.points_change),
          points_available: Math.max(0, (score.points_available ?? 0) - a.points_change),
        }).eq("id", score.id);
        reverted++;
      }
      await admin.from("point_adjustments").delete().eq("import_batch_id", batchId);
      return json({ ok: true, reverted });
    }

    // ------------------------------------------------------------ season target
    let seasonId: string | null = body.season_id ?? null;
    if (!seasonId) {
      const { data: season } = await admin
        .from("seasons").select("id, name").eq("status", "active").is("game_id", null)
        .order("start_date", { ascending: false }).limit(1).maybeSingle();
      if (!season) return json({ error: "No active global season found. Create one first." }, 400);
      seasonId = season.id;
    }
    const { data: seasonRow } = await admin
      .from("seasons").select("id, name").eq("id", seasonId).maybeSingle();
    if (!seasonRow) return json({ error: "Season not found" }, 400);

    const rows: InputRow[] = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return json({ error: "No rows supplied" }, 400);
    if (rows.length > 20000) return json({ error: "Too many rows (max 20,000)" }, 400);

    // ------------------------------------------------------------------ lookups
    const normalized = rows.map((r) => normalizeDiscord(r.discord)).filter(Boolean);
    const uniqueHandles = [...new Set(normalized)];

    // profiles with a discord username
    const { data: profileRows } = await admin
      .from("profiles").select("user_id, display_name, discord_username")
      .not("discord_username", "is", null);
    const profileMap = new Map<string, { user_id: string; display_name: string | null }[]>();
    for (const p of profileRows ?? []) {
      const key = normalizeDiscord(p.discord_username);
      if (!key) continue;
      const list = profileMap.get(key) ?? [];
      list.push({ user_id: p.user_id, display_name: p.display_name });
      profileMap.set(key, list);
    }

    // legacy users that already resolved to a real account
    const { data: legacyRows } = await admin
      .from("legacy_users").select("discord_username, matched_user_id")
      .not("discord_username", "is", null).not("matched_user_id", "is", null);
    const legacyMap = new Map<string, string[]>();
    for (const l of legacyRows ?? []) {
      const key = normalizeDiscord(l.discord_username);
      if (!key) continue;
      const list = legacyMap.get(key) ?? [];
      if (!list.includes(l.matched_user_id)) list.push(l.matched_user_id);
      legacyMap.set(key, list);
    }

    // existing balances for the target season
    const { data: scoreRows } = await admin
      .from("season_scores").select("id, user_id, points, points_available").eq("season_id", seasonId);
    const scoreMap = new Map((scoreRows ?? []).map((s) => [s.user_id, s]));

    // display names for legacy-matched users
    const legacyUserIds = [...new Set([...legacyMap.values()].flat())];
    const nameMap = new Map<string, string | null>();
    if (legacyUserIds.length) {
      for (let i = 0; i < legacyUserIds.length; i += 500) {
        const { data } = await admin
          .from("profiles").select("user_id, display_name").in("user_id", legacyUserIds.slice(i, i + 500));
        for (const p of data ?? []) nameMap.set(p.user_id, p.display_name);
      }
    }

    // ------------------------------------------------------------------ resolve
    const seenHandles = new Set<string>();
    const resolved: ResolvedRow[] = rows.map((r, idx) => {
      const rowNumber = r.row_number ?? idx + 2;
      const discord = String(r.discord ?? "").trim();
      const norm = normalizeDiscord(discord);
      const points = parsePoints(r.points);

      const base: ResolvedRow = {
        row_number: rowNumber,
        discord,
        normalized: norm,
        points,
        user_id: null,
        display_name: null,
        matched_via: null,
        current_points: 0,
        current_available: 0,
        reason: "ok",
      };

      if (!norm) return { ...base, reason: "blank_discord" };
      if (points === null || points <= 0) return { ...base, reason: "invalid_points" };
      if (seenHandles.has(norm)) return { ...base, reason: "duplicate_discord" };
      seenHandles.add(norm);

      const profileHits = profileMap.get(norm) ?? [];
      if (profileHits.length > 1) return { ...base, reason: "ambiguous" };
      if (profileHits.length === 1) {
        const hit = profileHits[0];
        const sc = scoreMap.get(hit.user_id);
        return {
          ...base,
          user_id: hit.user_id,
          display_name: hit.display_name,
          matched_via: "profile",
          current_points: sc?.points ?? 0,
          current_available: sc?.points_available ?? 0,
        };
      }

      const legacyHits = legacyMap.get(norm) ?? [];
      if (legacyHits.length > 1) return { ...base, reason: "ambiguous" };
      if (legacyHits.length === 1) {
        const uid = legacyHits[0];
        const sc = scoreMap.get(uid);
        return {
          ...base,
          user_id: uid,
          display_name: nameMap.get(uid) ?? null,
          matched_via: "legacy",
          current_points: sc?.points ?? 0,
          current_available: sc?.points_available ?? 0,
        };
      }

      return { ...base, reason: "no_match" };
    });

    const matched = resolved.filter((r) => r.reason === "ok" && r.user_id);
    const unmatched = resolved.filter((r) => !(r.reason === "ok" && r.user_id));
    const totalPoints = matched.reduce((s, r) => s + (r.points ?? 0), 0);

    const fingerprint = `${String(body.file_name ?? "upload")}|${rows.length}|${totalPoints}`;

    // duplicate-import detection
    const { data: priorBatch } = await admin
      .from("point_adjustments")
      .select("import_batch_id, created_at")
      .eq("adjustment_type", "csv_import")
      .ilike("reason", `%${fingerprint}%`)
      .limit(1)
      .maybeSingle();

    const summary = {
      season: { id: seasonRow.id, name: seasonRow.name },
      total_rows: rows.length,
      matched: matched.length,
      unmatched: unmatched.length,
      total_points: totalPoints,
      matched_via_profile: matched.filter((r) => r.matched_via === "profile").length,
      matched_via_legacy: matched.filter((r) => r.matched_via === "legacy").length,
      counts: {
        no_match: unmatched.filter((r) => r.reason === "no_match").length,
        blank_discord: unmatched.filter((r) => r.reason === "blank_discord").length,
        invalid_points: unmatched.filter((r) => r.reason === "invalid_points").length,
        ambiguous: unmatched.filter((r) => r.reason === "ambiguous").length,
        duplicate_discord: unmatched.filter((r) => r.reason === "duplicate_discord").length,
      },
      already_imported: priorBatch
        ? { batch_id: priorBatch.import_batch_id, imported_at: priorBatch.created_at }
        : null,
      fingerprint,
    };

    if (action !== "apply") {
      return json({ ok: true, dry_run: true, summary, matched, unmatched });
    }

    // -------------------------------------------------------------------- apply
    if (summary.already_imported && body.force !== true) {
      return json({ error: "This exact file appears to have been imported already.", summary }, 409);
    }
    if (!matched.length) return json({ error: "Nothing to import — no rows matched.", summary }, 400);

    const batchId = crypto.randomUUID();
    const reason = `CSV points import [${fingerprint}]`;
    let applied = 0;
    const failures: { row_number: number; error: string }[] = [];

    for (const r of matched) {
      const add = r.points!;
      const existing = scoreMap.get(r.user_id!);
      try {
        if (existing) {
          const { error } = await admin.from("season_scores").update({
            points: (existing.points ?? 0) + add,
            points_available: (existing.points_available ?? 0) + add,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id).select("id").single();
          if (error) throw error;
        } else {
          const { error } = await admin.from("season_scores").insert({
            season_id: seasonId,
            user_id: r.user_id,
            points: add,
            points_available: add,
          }).select("id").single();
          if (error) throw error;
        }
        const { error: audErr } = await admin.from("point_adjustments").insert({
          user_id: r.user_id,
          adjusted_by: user.id,
          season_id: seasonId,
          points_change: add,
          reason,
          adjustment_type: "csv_import",
          import_batch_id: batchId,
        }).select("id").single();
        if (audErr) throw audErr;
        applied++;
      } catch (e) {
        failures.push({ row_number: r.row_number, error: (e as Error).message });
      }
    }

    return json({ ok: true, dry_run: false, batch_id: batchId, applied, failures, summary, unmatched });
  } catch (err) {
    console.error("[import-points] failed", err);
    return json({ error: (err as Error).message ?? "Unexpected error" }, 500);
  }
});
