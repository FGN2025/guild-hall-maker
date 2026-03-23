import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ecosystem-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate via X-Ecosystem-Key header against env secret
    const providedKey = req.headers.get("x-ecosystem-key");
    if (!providedKey) {
      return new Response(JSON.stringify({ error: "Missing X-Ecosystem-Key header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storedKey = Deno.env.get("ECOSYSTEM_API_KEY");
    if (!storedKey) {
      console.error("ECOSYSTEM_API_KEY secret is not configured");
      return new Response(JSON.stringify({ error: "API key not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (providedKey !== storedKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, since, user_id, limit: queryLimit } = body;
    const rowLimit = Math.min(queryLimit || 100, 500);

    let result: any = null;

    switch (action) {
      case "tournaments": {
        let q = adminClient
          .from("tournaments")
          .select("id, name, game_id, status, start_date, end_date, max_participants, prize_pool, created_at, updated_at")
          .in("status", ["published", "in_progress", "completed"])
          .order("start_date", { ascending: false })
          .limit(rowLimit);
        if (since) q = q.gte("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        result = data;
        break;
      }

      case "tenant-events": {
        let q = adminClient
          .from("tenant_events")
          .select("id, tenant_id, name, game, description, format, start_date, end_date, status, image_url, max_participants, prize_pool, created_at, updated_at")
          .eq("is_public", true)
          .eq("status", "published")
          .order("start_date", { ascending: false })
          .limit(rowLimit);
        if (since) q = q.gte("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        result = data;
        break;
      }

      case "challenges": {
        let q = adminClient
          .from("challenges")
          .select("id, name, description, game_id, challenge_type, difficulty, points_reward, start_date, end_date, requires_evidence, cover_image_url, created_at, updated_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(rowLimit);
        if (since) q = q.gte("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        result = data;
        break;
      }

      case "player-progress": {
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id required for player-progress" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: enrollments, error: eErr } = await adminClient
          .from("challenge_enrollments")
          .select("id, challenge_id, status, enrolled_at, updated_at")
          .eq("user_id", user_id)
          .limit(rowLimit);
        if (eErr) throw eErr;

        const enrollmentIds = (enrollments || []).map((e: any) => e.id);
        let evidence: any[] = [];
        if (enrollmentIds.length > 0) {
          const { data: evData } = await adminClient
            .from("challenge_evidence")
            .select("id, enrollment_id, file_url, file_type, status, notes, submitted_at, task_id")
            .in("enrollment_id", enrollmentIds);
          evidence = evData || [];
        }

        const { data: completions } = await adminClient
          .from("challenge_completions")
          .select("id, challenge_id, awarded_points, completed_at")
          .eq("user_id", user_id);

        result = { enrollments, evidence, completions };
        break;
      }

      case "achievements": {
        let q = adminClient
          .from("player_achievements")
          .select("id, user_id, achievement_id, awarded_at, progress, notes, achievement_definitions(name, description, icon, tier, category)")
          .order("awarded_at", { ascending: false })
          .limit(rowLimit);
        if (user_id) q = q.eq("user_id", user_id);
        if (since) q = q.gte("awarded_at", since);
        const { data, error } = await q;
        if (error) throw error;
        result = data;
        break;
      }

      case "season-stats": {
        const { data: activeSeason } = await adminClient
          .from("seasons")
          .select("id, name, start_date, end_date")
          .eq("status", "active")
          .maybeSingle();

        if (!activeSeason) {
          result = { season: null, scores: [] };
          break;
        }

        let q = adminClient
          .from("season_scores")
          .select("user_id, points, wins, losses, tournaments_played, points_available")
          .eq("season_id", activeSeason.id)
          .order("points", { ascending: false })
          .limit(rowLimit);
        if (user_id) q = q.eq("user_id", user_id);
        const { data, error } = await q;
        if (error) throw error;
        result = { season: activeSeason, scores: data };
        break;
      }

      case "quests": {
        let q = adminClient
          .from("quests")
          .select("id, name, description, game_id, challenge_type, difficulty, points_reward, start_date, end_date, requires_evidence, cover_image_url, created_at, updated_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(rowLimit);
        if (since) q = q.gte("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        result = data;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid: tournaments, tenant-events, challenges, quests, player-progress, achievements, season-stats` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log the sync
    const targetApp = req.headers.get("x-ecosystem-app") || "unknown";
    await adminClient.from("ecosystem_sync_log").insert({
      target_app: targetApp,
      data_type: action,
      records_synced: Array.isArray(result) ? result.length : 1,
      status: "success",
    });

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Ecosystem data API error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
