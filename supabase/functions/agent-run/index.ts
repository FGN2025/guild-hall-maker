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
  const res = await fetch(AGENT_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${runnerToken}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
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

async function loadActivePrompt(): Promise<{ content: string; version: number } | null> {
  const { data } = await service()
    .from("agent_prompts")
    .select("content, version")
    .eq("name", "marketing_agent")
    .eq("active", true)
    .maybeSingle();
  return data ?? null;
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
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 500)}`);
  return JSON.parse(txt);
}

async function runAgentLoop(opts: {
  runId: string;
  tenantId: string;
  userId: string;
  systemPrompt: string;
  userMessage: string;
  turnCap: number;
}) {
  const { runId, tenantId, userId, systemPrompt, userMessage, turnCap } = opts;
  const runnerToken = await mintRunnerToken(userId, tenantId, runId, 1800);
  const tools = await fetchMcpTools(runnerToken);

  const messages: any[] = [{ role: "user", content: userMessage }];
  let inputTokens = 0;
  let outputTokens = 0;
  let turns = 0;
  let finalText = "";

  while (turns < turnCap) {
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
    await updateRun(runId, { turns_used: turns, input_tokens: inputTokens, output_tokens: outputTokens });

    const content = resp.content ?? [];
    messages.push({ role: "assistant", content });

    const toolUses = content.filter((c: any) => c.type === "tool_use");
    if (toolUses.length === 0) {
      finalText = content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n\n");
      return { status: "completed" as const, turns, inputTokens, outputTokens, finalText };
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

    if (resp.stop_reason === "end_turn" && toolUses.length === 0) break;
  }
  return { status: "failed" as const, turns, inputTokens, outputTokens, finalText, error: "turn_cap_exceeded" };
}

// ---- HTTP entry -----------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const jwt = authHeader.slice(7);
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
  } = payload ?? {};
  if (!tenant_id) return json({ error: "tenant_id required" }, 400);
  if (!["single_campaign", "weekly_slate"].includes(mode)) return json({ error: "invalid mode" }, 400);
  if (instruction && String(instruction).length > 500) return json({ error: "instruction max 500 chars" }, 400);

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

  const prompt = await loadActivePrompt();
  if (!prompt) return json({ error: "no active marketing_agent prompt" }, 500);

  const effectiveTurnCap = Math.max(1, Math.min(80, Number(turn_cap) || 40));

  const { data: run, error: runErr } = await svc.from("agent_runs").insert({
    tenant_id,
    launched_by: userId,
    agent_name: "marketing_agent",
    prompt_version: prompt.version,
    mode,
    archetype: archetype ?? null,
    anchor: anchor_event_id ?? anchor_tournament_id ?? null,
    instruction: instruction ?? null,
    status: "running",
    turn_cap: effectiveTurnCap,
  }).select().single();
  if (runErr || !run) return json({ error: runErr?.message ?? "run insert failed" }, 500);

  const userMessage = [
    `Tenant id: ${tenant_id}`,
    `Mode: ${mode}`,
    archetype ? `Archetype: ${archetype}` : null,
    anchor_event_id ? `Anchor tenant_event_id: ${anchor_event_id}` : null,
    anchor_tournament_id ? `Anchor tournament_id: ${anchor_tournament_id}` : null,
    instruction ? `Launcher instruction: ${instruction}` : null,
    "",
    "Follow the workflow strictly. Every write must be pending_review.",
  ].filter(Boolean).join("\n");

  // Fire and forget the loop so the HTTP call returns quickly with the run id.
  (async () => {
    try {
      // Test hook: verification harness may force an Anthropic-side error path.
      if ((payload as any)?._test_force_error) {
        throw new Error("forced_anthropic_error_for_verification");
      }
      const result = await runAgentLoop({
        runId: run.id,
        tenantId: tenant_id,
        userId,
        systemPrompt: prompt.content,
        userMessage,
        turnCap: effectiveTurnCap,
      });
      const created = await collectCreatedRowIds(tenant_id, userId, run.started_at);
      const patch: any = {
        turns_used: result.turns,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        created_row_ids: created,
        finished_at: new Date().toISOString(),
      };
      if (result.status === "completed") {
        patch.status = "completed";
        await updateRun(run.id, patch);
        await enqueueNotify(tenant_id, "agent_run_complete", { ...run, ...patch });
      } else {
        patch.status = "failed";
        patch.error_message = result.error;
        await updateRun(run.id, patch);
        await enqueueNotify(tenant_id, "agent_run_failed", { ...run, ...patch });
      }
    } catch (e) {
      const msg = (e as Error).message ?? "unknown error";
      console.error("[agent-run] loop crashed", msg);
      const created = await collectCreatedRowIds(tenant_id, userId, run.started_at).catch(() => ({}));
      await updateRun(run.id, {
        status: "failed",
        error_message: msg,
        finished_at: new Date().toISOString(),
        created_row_ids: created,
      });
      await enqueueNotify(tenant_id, "agent_run_failed", { ...run, error_message: msg });
    }
  })();

  return json({ run_id: run.id, status: "running" });
});
