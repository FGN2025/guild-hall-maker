// One-off verification harness for Checkpoint 1. Runs the full A–F suite
// against the deployed mcp and agent-mcp endpoints, using MCP_RUNNER_SIGNING_KEY
// to mint synthetic runner tokens. Delete after Checkpoint 1 sign-off.
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SIGN_KEY = Deno.env.get("MCP_RUNNER_SIGNING_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const MCP_URL = `${SUPABASE_URL}/functions/v1/mcp`;
const AGENT_MCP_URL = `${SUPABASE_URL}/functions/v1/agent-mcp`;
const key = new TextEncoder().encode(SIGN_KEY);

async function mintRunner(claims: {
  sub: string; tenant_id: string; agent_run_id: string; issuer?: string; client?: string; ttlSec?: number;
}) {
  return await new SignJWT({
    client: claims.client ?? "runner",
    tenant_id: claims.tenant_id,
    agent_run_id: claims.agent_run_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer(claims.issuer ?? "agent-run")
    .setExpirationTime(`${claims.ttlSec ?? 300}s`)
    .setIssuedAt()
    .sign(key);
}

async function postJson(url: string, token: string | null, body: any) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const results: any[] = [];
  const push = (name: string, pass: boolean, detail: any) => results.push({ name, pass, detail });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Pick a member (admin) and a second tenant for boundary tests.
  const { data: memberships } = await sb.from("tenant_admins")
    .select("tenant_id, user_id, role").in("role", ["admin","manager","marketing"]).limit(10);
  const primary = memberships?.[0];
  const otherTenant = memberships?.find((m: any) => m.tenant_id !== primary?.tenant_id);
  const outsiderMembership = memberships?.find((m: any) => m.user_id !== primary?.user_id);

  if (!primary || !otherTenant) {
    return new Response(JSON.stringify({ error: "not enough tenants for tests" }), { headers: CORS });
  }

  // ---- Create temp agent_runs row (status=running) ----
  const { data: runRow, error: runErr } = await sb.from("agent_runs").insert({
    tenant_id: primary.tenant_id,
    launched_by: primary.user_id,
    agent_name: "verification-harness",
    status: "running",
    turn_cap: 40,
    turns_used: 0,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    created_row_ids: [],
  }).select().single();
  if (runErr) return new Response(JSON.stringify({ stage: "insert_run", error: runErr }), { headers: CORS });

  const cleanup = async () => { await sb.from("agent_runs").delete().eq("id", runRow.id); };

  try {
    // ---- A) mcp endpoint negatives ----
    // A1: Supabase session-shaped token (use anon key — mcp OAuth verifier should reject).
    // A2: anon key.
    // A3: hand-minted runner token (mcp should reject non-OAuth token).
    const initBody = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "verify", version: "0" } } };

    const a1 = await postJson(MCP_URL, ANON, initBody);
    push("A1 mcp rejects anon-key-as-bearer", a1.status === 401 || (a1.body?.error && a1.status !== 200), { status: a1.status, body: a1.body });

    const a2 = await postJson(MCP_URL, null, initBody);
    push("A2 mcp rejects missing bearer", a2.status === 401 || (a2.body?.error && a2.status !== 200), { status: a2.status, body: a2.body });

    const runnerTok = await mintRunner({ sub: primary.user_id, tenant_id: primary.tenant_id, agent_run_id: runRow.id });
    const a3 = await postJson(MCP_URL, runnerTok, initBody);
    push("A3 mcp rejects runner token", a3.status === 401 || (a3.body?.error && a3.status !== 200), { status: a3.status, body: a3.body });

    // ---- B) agent-mcp negatives ----
    const b1 = await postJson(AGENT_MCP_URL, ANON, initBody);
    push("B1 agent-mcp rejects anon key", b1.status === 401, { status: b1.status, body: b1.body });

    // OAuth-shaped token — mint a jose-signed token with different issuer to simulate OAuth
    const oauthShapedTok = await mintRunner({ sub: primary.user_id, tenant_id: primary.tenant_id, agent_run_id: runRow.id, issuer: "https://example.supabase.co/auth/v1", client: "oauth-client" });
    const b2 = await postJson(AGENT_MCP_URL, oauthShapedTok, initBody);
    push("B2 agent-mcp rejects wrong-issuer token", b2.status === 401, { status: b2.status, body: b2.body });

    const b3 = await postJson(AGENT_MCP_URL, null, initBody);
    push("B3 agent-mcp rejects missing bearer", b3.status === 401, { status: b3.status, body: b3.body });

    // ---- C) Synthetic acceptance: valid runner token, tools/list + a tools/call ----
    const c1 = await postJson(AGENT_MCP_URL, runnerTok, initBody);
    push("C1 agent-mcp accepts runner token (initialize)", c1.status === 200 && !!c1.body?.result?.serverInfo, { status: c1.status, body: c1.body });

    const c2 = await postJson(AGENT_MCP_URL, runnerTok, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    const toolNames = (c2.body?.result?.tools ?? []).map((t: any) => t.name);
    push("C2 tools/list returns registry", c2.status === 200 && toolNames.includes("list_tenants") && toolNames.includes("propose_scheduled_post"), { count: toolNames.length, sample: toolNames.slice(0, 5) });

    const c3 = await postJson(AGENT_MCP_URL, runnerTok, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "list_tenants", arguments: {} } });
    const tenants = c3.body?.result?.structuredContent?.tenants;
    push("C3 list_tenants scoped to token tenant", Array.isArray(tenants) && tenants.length === 1 && tenants[0].id === primary.tenant_id, { tenants });

    // ---- D) RLS-equivalence ----
    // D1: write with mismatching tenant_id -> rejected at dispatch (isError=true).
    const d1 = await postJson(AGENT_MCP_URL, runnerTok, {
      jsonrpc: "2.0", id: 4, method: "tools/call",
      params: { name: "create_campaign_draft", arguments: { tenant_id: otherTenant.tenant_id, title: "boundary probe" } },
    });
    const d1IsError = d1.body?.result?.isError === true;
    const d1Msg = d1.body?.result?.content?.[0]?.text ?? "";
    push("D1 tenant-boundary violation rejected", d1IsError && /boundary/i.test(d1Msg), { text: d1Msg });

    // D2: token whose sub lacks marketer role on tenant_id.
    // Use a fresh uuid as sub with primary tenant → tenant_admins lookup fails.
    const rogueTok = await mintRunner({ sub: crypto.randomUUID(), tenant_id: primary.tenant_id, agent_run_id: runRow.id });
    const d2 = await postJson(AGENT_MCP_URL, rogueTok, initBody);
    push("D2 non-marketer sub rejected", d2.status === 401 && /marketer|launched_by/i.test(JSON.stringify(d2.body)), { status: d2.status, body: d2.body });

    // ---- E) Revocation ----
    await sb.from("agent_runs").update({ status: "failed", finished_at: new Date().toISOString() }).eq("id", runRow.id);
    const e1 = await postJson(AGENT_MCP_URL, runnerTok, initBody);
    push("E1 revoked run (status=failed) rejected", e1.status === 401 && /status is failed/i.test(JSON.stringify(e1.body)), { status: e1.status, body: e1.body });

  } finally {
    await cleanup();
  }

  const pass = results.every((r) => r.pass);
  return new Response(JSON.stringify({ pass, results }, null, 2), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
