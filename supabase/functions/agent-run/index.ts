/*
 * agent-run — hosted marketing-agent runner
 * ----------------------------------------------------------------------------
 * Callable by a tenant admin/manager (or platform admin) to launch a Claude-
 * driven marketing planning session against a specific tenant. The model
 * reaches its tools via the sibling `agent-mcp` endpoint using a short-lived
 * HS256 runner token minted with MCP_RUNNER_SIGNING_KEY (see agent-mcp
 * SECURITY MODEL). Every write the agent makes lands as pending_review; this
 * function neither publishes nor mutates content directly.
 * ----------------------------------------------------------------------------
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SIGNING_KEY = Deno.env.get("MCP_RUNNER_SIGNING_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const AGENT_MCP_URL = `${SUPABASE_URL}/functions/v1/agent-mcp`;

const service = () => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function mintRunnerToken(sub: string, tenantId: string, runId: string, ttlSeconds = 1800) {
  const key = new TextEncoder().encode(SIGNING_KEY);
  return await new SignJWT({
    sub,
    tenant_id: tenantId,
    agent_run_id: runId,
    client: "runner",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("agent-run")
    .setAudience("agent-mcp")
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

async function mcpCall(runnerToken: string, method: string, params: unknown, id: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), MCP_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(AGENT_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${runnerToken}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`agent-mcp ${method} timed out after ${MCP_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(t);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    throw new Error(`agent-mcp ${method} failed: ${body?.error?.message ?? res.status}`);
  }
  return body.result;
}

async function updateRun(id: string, patch: Record<string, unknown>) {
  await service().from("agent_runs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}

async function enqueueNotify(tenantId: string, category: string, runRow: any) {
  try {
    await service().rpc("enqueue_marketing_notification", {
      _tenant_id: tenantId,
      _category: category,
      _related_kind: "agent_run",
      _related_id: runRow.id,
      _title: category === "agent_run_failed" ? "Marketing agent run failed" : "Marketing agent run complete",
      _message: category === "agent_run_failed"
        ? `Run failed: ${runRow.error_message ?? "unknown error"}`
        : `Run finished, ${(runRow.created_row_ids ?? []).length} draft(s) awaiting review.`,
      _link: `/tenant/marketing?tab=agent`,
      _agent_source: "claude-mcp",
      _payload: {
        run_id: runRow.id,
        turns_used: runRow.turns_used,
        input_tokens: runRow.input_tokens,
        output_tokens: runRow.output_tokens,
      },
    });
  } catch (e) {
    console.error("[agent-run] notification enqueue failed", (e as Error).message);
  }
}

/** The calendar-seed lane runs on its own prompt; every other mode keeps the
 *  general marketing_agent prompt. */
function promptNameForMode(mode: string) {
  return mode === "monthly_calendar_seed" ? "marketing_agent_calendar_seed" : "marketing_agent";
}

async function loadActivePrompt(mode: string): Promise<{ name: string; content: string; version: number } | null> {
  const name = promptNameForMode(mode);
  const { data } = await service()
    .from("agent_prompts")
    .select("content, version")
    .eq("name", name)
    .eq("active", true)
    .maybeSingle();
  return data ? { name, ...data } : null;
}

/** Per-mode turn budget from agent_mode_config (agent_run_limits is untouched —
 *  it still governs daily/monthly run counts only). */
async function turnCapForMode(mode: string): Promise<number> {
  const { data } = await service()
    .from("agent_mode_config")
    .select("turn_cap")
    .eq("mode", mode)
    .maybeSingle();
  return data?.turn_cap ?? 40;
}

async function checkLimits(tenantId: string): Promise<{ ok: boolean; reason?: string }> {
  const svc = service();
  // Kill switch
  const { data: kill } = await svc.from("app_settings").select("value").eq("key", "agent_launches_enabled").maybeSingle();
  if (kill && kill.value === "false") {
    return { ok: false, reason: "Agent launches are currently disabled by platform admin." };
  }
  // Per-tenant overrides
  const { data: limits } = await svc.from("agent_run_limits").select("daily_limit, monthly_limit").eq("tenant_id", tenantId).maybeSingle();
  const dailyCap = limits?.daily_limit ?? 2;
  const monthlyCap = limits?.monthly_limit ?? 10;
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const { count: dayCount } = await svc.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).gte("started_at", startOfDay.toISOString());
  const { count: monthCount } = await svc.from("agent_runs").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).gte("started_at", startOfMonth.toISOString());
  if ((dayCount ?? 0) >= dailyCap) return { ok: false, reason: `Daily agent-run limit reached (${dailyCap}/day).` };
  if ((monthCount ?? 0) >= monthlyCap) return { ok: false, reason: `Monthly agent-run limit reached (${monthlyCap}/month).` };
  return { ok: true };
}

async function collectCreatedRowIds(tenantId: string, userId: string, startedAtIso: string) {
  const svc = service();
  const since = startedAtIso;
  const [camp, posts, assets] = await Promise.all([
    svc.from("marketing_campaigns").select("id").eq("tenant_id", tenantId).eq("proposed_by", userId).gte("created_at", since),
    svc.from("scheduled_posts").select("id").eq("tenant_id", tenantId).eq("proposed_by", userId).gte("created_at", since),
    svc.from("tenant_marketing_assets").select("id").eq("tenant_id", tenantId).eq("proposed_by", userId).gte("created_at", since),
  ]);
  return {
    campaigns: (camp.data ?? []).map((r) => r.id),
    scheduled_posts: (posts.data ?? []).map((r) => r.id),
    tenant_marketing_assets: (assets.data ?? []).map((r) => r.id),
  };
}

// ---- Anthropic loop -------------------------------------------------------

type AnthropicTool = { name: string; description?: string; input_schema: any };

async function fetchMcpTools(runnerToken: string): Promise<AnthropicTool[]> {
  const res = await mcpCall(runnerToken, "tools/list", {}, 1);
  const list = (res?.tools ?? []) as any[];
  return list.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema ?? t.input_schema ?? { type: "object", properties: {} },
  }));
}

async function callAnthropic(body: any) {
  // Hard timeout: a hung upstream must not consume the whole slice budget.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ANTHROPIC_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`anthropic_timeout after ${ANTHROPIC_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(t);
  }
  const txt = await res.text();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 500)}`);
  return JSON.parse(txt);
}

/* Wall-clock budget for a single invocation.
 * ROOT CAUSE (2026-08-04): this was 200s, above the edge worker's effective
 * wall-clock ceiling (observed kills at 150s and 187s). The worker was
 * terminated by the platform — not by a JS exception — so the `continue`
 * branch never fired, driveRun's catch never ran, the transcript was never
 * persisted, and the run was left `running` forever at turns_used = 4.
 * The budget must stay well under the ceiling, and it must reserve room for
 * one more full turn before starting it. */
const SLICE_BUDGET_MS = 80_000;
/** Pessimistic cost of one more model turn plus its tool round-trips. */
const TURN_RESERVE_MS = 45_000;
const ANTHROPIC_TIMEOUT_MS = 60_000;
const MCP_TIMEOUT_MS = 30_000;
const MAX_CONTINUATIONS = 15;


async function runAgentLoop(opts: {
  runId: string;
  tenantId: string;
  userId: string;
  systemPrompt: string;
  userMessage: string;
  turnCap: number;
  initialMessages?: any[];
  turnsSoFar?: number;
  inputTokensSoFar?: number;
  outputTokensSoFar?: number;
}) {
  const { runId, tenantId, userId, systemPrompt, userMessage, turnCap } = opts;
  const runnerToken = await mintRunnerToken(userId, tenantId, runId, 1800);
  const tools = await fetchMcpTools(runnerToken);

  const messages: any[] = opts.initialMessages?.length
    ? opts.initialMessages
    : [{ role: "user", content: userMessage }];
  let inputTokens = opts.inputTokensSoFar ?? 0;
  let outputTokens = opts.outputTokensSoFar ?? 0;
  let turns = opts.turnsSoFar ?? 0;
  let finalText = "";
  const sliceStart = Date.now();

  while (turns < turnCap) {
    // Hand off BEFORE a turn we cannot certainly finish inside this worker's
    // wall-clock life. Reserving a full turn is what keeps the platform from
    // killing us mid-turn (which loses the finalize path entirely).
    if (Date.now() - sliceStart + TURN_RESERVE_MS > SLICE_BUDGET_MS) {
      return { status: "continue" as const, turns, inputTokens, outputTokens, finalText: "", messages };
    }
    turns += 1;
    const resp = await callAnthropic({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      tools,
      messages,
    });
    inputTokens += resp.usage?.input_tokens ?? 0;
    outputTokens += resp.usage?.output_tokens ?? 0;

    const content = resp.content ?? [];
    messages.push({ role: "assistant", content });

    // Persist the transcript every turn: an abrupt worker kill then loses at
    // most the current turn, and the watchdog/resume path has real state.
    await updateRun(runId, {
      turns_used: turns,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      transcript: messages,
      heartbeat_at: new Date().toISOString(),
    });

    const toolUses = content.filter((c: any) => c.type === "tool_use");
    if (toolUses.length === 0) {
      finalText = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n\n");
      return { status: "completed" as const, turns, inputTokens, outputTokens, finalText, messages };
    }

    const toolResults: any[] = [];
    for (const tu of toolUses) {
      try {
        const r = await mcpCall(runnerToken, "tools/call", { name: tu.name, arguments: tu.input }, turns * 100);
        const text = r?.content?.map((c: any) => c.text).join("\n") ?? JSON.stringify(r);
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: text, is_error: !!r?.isError });
      } catch (e) {
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: (e as Error).message, is_error: true });
      }
    }
    messages.push({ role: "user", content: toolResults });
    await updateRun(runId, { transcript: messages, heartbeat_at: new Date().toISOString() });

    if (resp.stop_reason === "end_turn" && toolUses.length === 0) break;
  }

  return { status: "failed" as const, turns, inputTokens, outputTokens, finalText, messages, error: "turn_cap_exceeded" };
}

/** Re-invoke this function to continue a run in a fresh invocation. */
async function handOff(runId: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "x-runner-continuation": SIGNING_KEY,
    },
    body: JSON.stringify({ resume_run_id: runId }),
  });
  if (!res.ok) throw new Error(`continuation handoff failed: ${res.status} ${await res.text()}`);
  await res.text().catch(() => "");
}

/** Drive one slice of a run and either finish it or hand off to the next slice. */
async function driveRun(params: {
  run: any;
  tenantId: string;
  userId: string;
  systemPrompt: string;
  userMessage: string;
  turnCap: number;
  initialMessages?: any[];
}) {
  const { run, tenantId, userId, systemPrompt, userMessage, turnCap } = params;
  try {
    const result = await runAgentLoop({
      runId: run.id,
      tenantId,
      userId,
      systemPrompt,
      userMessage,
      turnCap,
      initialMessages: params.initialMessages,
      turnsSoFar: run.turns_used ?? 0,
      inputTokensSoFar: run.input_tokens ?? 0,
      outputTokensSoFar: run.output_tokens ?? 0,
    });

    if (result.status === "continue") {
      const nextCount = (run.continuation_count ?? 0) + 1;
      if (nextCount > MAX_CONTINUATIONS) {
        await updateRun(run.id, {
          status: "failed",
          error_message: "continuation_limit_exceeded",
          finished_at: new Date().toISOString(),
          turns_used: result.turns,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          created_row_ids: await collectCreatedRowIds(tenantId, userId, run.started_at),
        });
        await enqueueNotify(tenantId, "agent_run_failed", { ...run, error_message: "continuation_limit_exceeded" });
        return;
      }
      await updateRun(run.id, {
        transcript: result.messages,
        continuation_count: nextCount,
        turns_used: result.turns,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        heartbeat_at: new Date().toISOString(),
      });
      await handOff(run.id);
      return;
    }

    const created = await collectCreatedRowIds(tenantId, userId, run.started_at);
    const patch: any = {
      turns_used: result.turns,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      created_row_ids: created,
      finished_at: new Date().toISOString(),
      transcript: result.messages,
      heartbeat_at: new Date().toISOString(),
    };
    if (result.status === "completed") {
      patch.status = "completed";
      await updateRun(run.id, patch);
      await enqueueNotify(tenantId, "agent_run_complete", { ...run, ...patch });
    } else {
      patch.status = "failed";
      patch.error_message = (result as any).error ?? "unknown";
      await updateRun(run.id, patch);
      await enqueueNotify(tenantId, "agent_run_failed", { ...run, ...patch });
    }
  } catch (e) {
    const msg = (e as Error).message ?? "unknown error";
    console.error("[agent-run] loop crashed", msg);
    const created = await collectCreatedRowIds(tenantId, userId, run.started_at).catch(() => ({}));
    await updateRun(run.id, {
      status: "failed",
      error_message: msg,
      finished_at: new Date().toISOString(),
      created_row_ids: created,
    });
    await enqueueNotify(tenantId, "agent_run_failed", { ...run, error_message: msg });
  }
}


// ---- HTTP entry -----------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7);

  // ---- Continuation branch: an earlier slice of a run handing itself off.
  // Authenticated by the shared runner signing key, never by a user session.
  const contKey = req.headers.get("x-runner-continuation");
  if (contKey) {
    if (contKey !== SIGNING_KEY) return json({ error: "unauthorized" }, 401);
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
    const resumeId = body?.resume_run_id;
    if (!resumeId) return json({ error: "resume_run_id required" }, 400);

    const { data: prev } = await service().from("agent_runs").select("*").eq("id", resumeId).maybeSingle();
    if (!prev) return json({ error: "run not found" }, 404);
    if (prev.status !== "running") return json({ error: `run is ${prev.status}` }, 409);

    const resumePrompt = await loadActivePrompt(prev.mode ?? "single_campaign");
    if (!resumePrompt) return json({ error: "no active prompt" }, 500);

    const resumeWork = driveRun({
      run: prev,
      tenantId: prev.tenant_id,
      userId: prev.launched_by,
      systemPrompt: resumePrompt.content,
      userMessage: "",
      turnCap: prev.turn_cap,
      initialMessages: (prev.transcript as any[]) ?? undefined,
    });
    // @ts-ignore EdgeRuntime is provided by the Supabase runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(resumeWork);
    return json({ run_id: resumeId, status: "running", continuation: (prev.continuation_count ?? 0) });
  }


  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: claimsErr } = await userClient.auth.getUser(jwt);
  if (claimsErr || !userData?.user?.id) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const {
    tenant_id,
    mode = "single_campaign",
    archetype,
    anchor_event_id,
    anchor_tournament_id,
    instruction,
    turn_cap,
    target_month,
    seed_density,
  } = payload ?? {};
  if (!tenant_id) return json({ error: "tenant_id required" }, 400);
  if (!["single_campaign", "weekly_slate", "monthly_calendar_seed"].includes(mode)) {
    return json({ error: "invalid mode" }, 400);
  }
  if (instruction && String(instruction).length > 500) return json({ error: "instruction max 500 chars" }, 400);

  let seedMonth: string | null = null;
  if (mode === "monthly_calendar_seed") {
    if (!target_month || !/^\d{4}-\d{2}$/.test(String(target_month))) {
      return json({ error: "target_month (YYYY-MM) required for monthly_calendar_seed" }, 400);
    }
    const mNum = Number(String(target_month).slice(5, 7));
    if (mNum < 1 || mNum > 12) return json({ error: "target_month month out of range" }, 400);
    seedMonth = String(target_month);
  }
  if (seed_density && !["light", "standard", "full"].includes(seed_density)) {
    return json({ error: "seed_density must be light, standard or full" }, 400);
  }

  const svc = service();

  // Authorize: platform admin OR tenant admin/manager on the target tenant
  const { data: platformAdmin } = await svc.rpc("has_role", { _user_id: userId, _role: "admin" });
  let allowed = !!platformAdmin;
  if (!allowed) {
    const { data: ta } = await svc.from("tenant_admins")
      .select("role").eq("tenant_id", tenant_id).eq("user_id", userId).maybeSingle();
    if (ta && (ta.role === "admin" || ta.role === "manager")) allowed = true;
  }
  if (!allowed) return json({ error: "forbidden: admin or manager role required on target tenant" }, 403);

  // Kill switch + limits
  const gate = await checkLimits(tenant_id);
  if (!gate.ok) return json({ error: gate.reason }, 429);

  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

  const prompt = await loadActivePrompt(mode);
  if (!prompt) return json({ error: `no active ${promptNameForMode(mode)} prompt` }, 500);

  // Resolve the effective density: explicit launch value, else the tenant default.
  let effectiveDensity: string | null = null;
  if (mode === "monthly_calendar_seed") {
    if (seed_density) {
      effectiveDensity = seed_density;
    } else {
      const { data: t } = await svc.from("tenants").select("marketing_seed_density").eq("id", tenant_id).maybeSingle();
      effectiveDensity = t?.marketing_seed_density ?? "standard";
    }
  }

  const modeCap = await turnCapForMode(mode);
  const effectiveTurnCap = Math.max(1, Math.min(modeCap, Number(turn_cap) || modeCap));

  const { data: run, error: runErr } = await svc.from("agent_runs").insert({
    tenant_id,
    launched_by: userId,
    agent_name: prompt.name,
    prompt_version: prompt.version,
    mode,
    archetype: archetype ?? null,
    anchor: anchor_event_id ?? anchor_tournament_id ?? null,
    instruction: instruction ?? null,
    status: "running",
    turn_cap: effectiveTurnCap,
    target_month: seedMonth,
    seed_density: effectiveDensity,
  }).select().single();
  if (runErr || !run) return json({ error: runErr?.message ?? "run insert failed" }, 500);

  const userMessage = [
    `Tenant id: ${tenant_id}`,
    `Mode: ${mode}`,
    seedMonth ? `Target month: ${seedMonth}` : null,
    effectiveDensity ? `Seed density: ${effectiveDensity}` : null,
    archetype ? `Archetype: ${archetype}` : null,
    anchor_event_id ? `Anchor tenant_event_id: ${anchor_event_id}` : null,
    anchor_tournament_id ? `Anchor tournament_id: ${anchor_tournament_id}` : null,
    instruction ? `Launcher instruction: ${instruction}` : null,
    "",
    "Follow the workflow strictly. Every write must be pending_review.",
  ].filter(Boolean).join("\n");

  // Background the loop so the HTTP call returns quickly with the run id.
  // waitUntil keeps the worker alive past the response; driveRun hands off to a
  // fresh invocation when a slice runs out of wall-clock budget.
  const work = driveRun({
    run,
    tenantId: tenant_id,
    userId,
    systemPrompt: prompt.content,
    userMessage,
    turnCap: effectiveTurnCap,
  });
  // @ts-ignore EdgeRuntime is provided by the Supabase runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);

  return json({ run_id: run.id, status: "running" });

});
