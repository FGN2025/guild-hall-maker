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

/** Build stamp — shared single source in ../_shared/build-id.ts so agent-run,
 *  agent-mcp and mcp can never disagree about which code is live. */
import { BUILD_ID } from "../_shared/build-id.ts";
/* Structured scope: the pre-flight the launcher confirms and the constraint
 * block this runner injects come from ONE module, so they cannot drift. */
import {
  buildPreflight,
  renderConstraintBlock,
  scopeSummary,
  classifyFailure,
} from "../_shared/seed-scope.ts";


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

/* Streaming model call.
 * DESIGN (2026-08-05): the previous non-streaming call gave zero incremental
 * signal, so a legitimately large turn (the calendar-seed plan turn emits a
 * multi-tool block over 14 events) was indistinguishable from a hang and got
 * aborted at a flat 60s. Liveness is now measured by TOKEN ARRIVAL: as long as
 * the stream keeps producing events we keep waiting. The idle detector is the
 * primary mechanism; the total ceiling is only defense in depth. */
async function callAnthropic(body: any) {
  const ctrl = new AbortController();
  const started = Date.now();
  let lastEventAt = Date.now();
  let aborted: "idle" | "total" | null = null;

  const watchdog = setInterval(() => {
    const now = Date.now();
    if (now - lastEventAt > ANTHROPIC_IDLE_MS) { aborted = "idle"; ctrl.abort(); }
    else if (now - started > ANTHROPIC_TOTAL_MS) { aborted = "total"; ctrl.abort(); }
  }, 1_000);

  const failure = () =>
    aborted === "idle"
      ? new Error(`anthropic_stream_idle: no tokens for ${ANTHROPIC_IDLE_MS}ms`)
      : new Error(`anthropic_timeout after ${ANTHROPIC_TOTAL_MS}ms`);

  try {
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          accept: "text/event-stream",
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal: ctrl.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw failure();
      throw e;
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 500)}`);
    }
    if (!res.body) throw new Error("Anthropic stream: empty body");

    // Assemble the message from the SSE event stream.
    const content: any[] = [];
    const partials = new Map<number, string>();
    let stopReason: string | null = null;
    const usage = { input_tokens: 0, output_tokens: 0 };

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        lastEventAt = Date.now(); // token arrival == liveness
        buf += value;
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let ev: any;
          try { ev = JSON.parse(payload); } catch { continue; }
          switch (ev.type) {
            case "message_start":
              usage.input_tokens += ev.message?.usage?.input_tokens ?? 0;
              usage.output_tokens += ev.message?.usage?.output_tokens ?? 0;
              break;
            case "content_block_start":
              content[ev.index] = { ...ev.content_block };
              partials.set(ev.index, "");
              break;
            case "content_block_delta": {
              const d = ev.delta ?? {};
              if (d.type === "text_delta") {
                content[ev.index].text = (content[ev.index].text ?? "") + (d.text ?? "");
              } else if (d.type === "input_json_delta") {
                partials.set(ev.index, (partials.get(ev.index) ?? "") + (d.partial_json ?? ""));
              }
              break;
            }
            case "content_block_stop": {
              const raw = partials.get(ev.index);
              if (content[ev.index]?.type === "tool_use") {
                try { content[ev.index].input = raw ? JSON.parse(raw) : {}; }
                catch { content[ev.index].input = {}; }
              }
              break;
            }
            case "message_delta":
              stopReason = ev.delta?.stop_reason ?? stopReason;
              usage.output_tokens += ev.usage?.output_tokens ?? 0;
              break;
            case "error":
              throw new Error(`Anthropic stream error: ${ev.error?.message ?? "unknown"}`);
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") throw failure();
      throw e;
    }

    return { content: content.filter(Boolean), stop_reason: stopReason, usage };
  } finally {
    clearInterval(watchdog);
  }
}

/** Timeouts are transient, never fatal: retry the same turn once with backoff. */
function isTransientModelError(msg: string) {
  return /anthropic_stream_idle|anthropic_timeout|Anthropic 429|Anthropic 5\d\d|stream error/i.test(msg);
}

async function callAnthropicWithRetry(body: any) {
  try {
    return await callAnthropic(body);
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (!isTransientModelError(msg)) throw e;
    console.warn("[agent-run] transient model error, retrying once:", msg);
    await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
    return await callAnthropic(body);
  }
}

/* Wall-clock budget for a single invocation.
 * ROOT CAUSE (2026-08-04): this was 200s, above the edge worker's effective
 * wall-clock ceiling (observed kills at 150s and 187s). The worker was
 * terminated by the platform — not by a JS exception — so the `continue`
 * branch never fired, driveRun's catch never ran, the transcript was never
 * persisted, and the run was left `running` forever at turns_used = 4.
 * The budget must stay well under the ceiling, and it must reserve room for
 * one more full turn before starting it.
 * 2026-08-05: reserve raised to 60s so a large turn effectively starts a FRESH
 * slice — we never begin a plan-sized turn with the worker already half spent. */
const SLICE_BUDGET_MS = 70_000;
/** Pessimistic cost of one more model turn plus its tool round-trips. */
const TURN_RESERVE_MS = 60_000;
/** Primary liveness mechanism: abort only when the stream itself stalls. */
const ANTHROPIC_IDLE_MS = 45_000;
/** Defense in depth only — must exceed the largest legitimate turn with margin. */
const ANTHROPIC_TOTAL_MS = 90_000;
const RETRY_BACKOFF_MS = 2_000;
const MCP_TIMEOUT_MS = 30_000;
/* A slice now covers ~1-2 turns, so a 100-turn seed legitimately needs dozens
 * of handoffs. 15 was sized for the old 200s slice and would abort a real seed. */
const MAX_CONTINUATIONS = 60;




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
  /** Run start instant, used for live created-row progress. */
  startedAtIso?: string;
  /** Test override: shrink the slice so the continuation path is exercised. */
  sliceBudgetMs?: number;
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
  const sliceBudget = opts.sliceBudgetMs ?? SLICE_BUDGET_MS;
  // Never reserve more than the slice itself, or a shrunken test slice would
  // hand off forever without ever taking a turn.
  const turnReserve = Math.min(TURN_RESERVE_MS, Math.floor(sliceBudget / 2));
  let turnsThisSlice = 0;

  while (turns < turnCap) {
    // Hand off BEFORE a turn we cannot certainly finish inside this worker's
    // wall-clock life. Reserving a full turn is what keeps the platform from
    // killing us mid-turn (which loses the finalize path entirely).
    // Guarantee forward progress: always take at least one turn per slice.
    if (turnsThisSlice > 0 && Date.now() - sliceStart + turnReserve > sliceBudget) {
      return { status: "continue" as const, turns, inputTokens, outputTokens, finalText: "", messages };
    }
    turnsThisSlice += 1;

    turns += 1;
    let resp: any;
    try {
      resp = await callAnthropicWithRetry({
        model: ANTHROPIC_MODEL,
        max_tokens: 16000,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (e) {
      const msg = (e as Error).message ?? "";
      // A slow or stalled model call must never discard a run. The transcript
      // is already persisted, so end the SLICE and let the next one resume.
      if (isTransientModelError(msg)) {
        console.warn("[agent-run] model call failed after retry, ending slice for resume:", msg);
        turns -= 1;
        return { status: "continue" as const, turns, inputTokens, outputTokens, finalText: "", messages };
      }
      throw e;
    }

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

    // Live progress: refresh the created-row ids while the run is still
    // running so the UI can show rows-created instead of a bare spinner.
    if (opts.startedAtIso && turns % 3 === 0) {
      try {
        await updateRun(runId, { created_row_ids: await collectCreatedRowIds(tenantId, userId, opts.startedAtIso) });
      } catch { /* progress is best-effort, never fail a run over it */ }
    }

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
async function handOff(runId: string, sliceBudgetMs?: number) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "x-runner-continuation": SIGNING_KEY,
    },
    body: JSON.stringify({ resume_run_id: runId, slice_budget_ms: sliceBudgetMs ?? null }),
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
  sliceBudgetMs?: number;
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
      sliceBudgetMs: params.sliceBudgetMs,
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
      await handOff(run.id, params.sliceBudgetMs);
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
  if (req.method === "GET") return json({ build_id: BUILD_ID });
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

    // Repair a transcript that was cut mid-turn: Anthropic rejects a trailing
    // assistant message whose tool_use blocks have no matching tool_result.
    const resumeMessages = Array.isArray(prev.transcript) ? [...(prev.transcript as any[])] : [];
    const last = resumeMessages[resumeMessages.length - 1];
    if (last?.role === "assistant") {
      const pending = (last.content ?? []).filter((c: any) => c?.type === "tool_use");
      if (pending.length) {
        resumeMessages.push({
          role: "user",
          content: pending.map((tu: any) => ({
            type: "tool_result",
            tool_use_id: tu.id,
            content: "interrupted: the previous slice ended before this tool returned. Re-check state before retrying it.",
            is_error: true,
          })),
        });
      } else {
        resumeMessages.pop();
      }
    }

    const resumeWork = driveRun({
      run: prev,
      tenantId: prev.tenant_id,
      userId: prev.launched_by,
      systemPrompt: resumePrompt.content,
      userMessage: "",
      turnCap: prev.turn_cap,
      initialMessages: resumeMessages.length ? resumeMessages : undefined,
      sliceBudgetMs: Number(body?.slice_budget_ms) || undefined,
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
    slice_budget_ms,
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
  // Platform-admin-only test override: shrink the slice so the continuation
  // path is exercised many times in a short run. Never accepted from tenants.
  const debugSlice = platformAdmin
    ? Math.max(15_000, Math.min(SLICE_BUDGET_MS, Number(slice_budget_ms) || 0)) || undefined
    : undefined;

  const work = driveRun({
    run,
    tenantId: tenant_id,
    userId,
    systemPrompt: prompt.content,
    userMessage,
    turnCap: effectiveTurnCap,
    sliceBudgetMs: debugSlice,
  });

  // @ts-ignore EdgeRuntime is provided by the Supabase runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);

  return json({ run_id: run.id, status: "running" });

});
