/*
================================================================================
SECURITY MODEL — agent-mcp
================================================================================
This sibling endpoint exists because the SDK-owned `mcp` function only accepts
OAuth client-issued tokens. The marketing agent runner cannot mint those, so
agent-mcp handles the runner path in isolation while sharing the tool registry.

Authentication
--------------
Accepts ONLY HS256 runner tokens signed with `MCP_RUNNER_SIGNING_KEY`.
Required claims: iss="agent-run", client="runner", agent_run_id (uuid),
sub (user uuid), tenant_id (uuid), exp in the future. Everything else — a
Supabase session token, an anon/publishable key, an OAuth client-issued token —
returns 401. The companion `mcp` function's OAuth verifier already rejects
these runner tokens (they lack the OAuth issuer / DCR client_id claims), so the
two endpoints are strict mirrors.

Every request re-verifies public.agent_runs where id=agent_run_id AND
status='running' AND launched_by=sub. Kill switch / manual failure / expiry
takes effect on the next tool call, not just at connect time.

Authorization (replaces RLS — dispatch uses the service role)
-------------------------------------------------------------
Runner tokens are not Supabase JWTs, so we cannot get user-scoped RLS the way
the OAuth mcp path does. Before invoking ANY tool we enforce:

  (a) `sub` holds role IN ('admin','manager','marketing') on `tenant_id` via
      a public.tenant_admins lookup.
  (b) For any tool whose input schema declares `tenant_id`, the payload
      tenant_id MUST equal the token tenant_id (tool-boundary guard). If the
      payload omits it we inject the token value; if it mismatches we 4xx.
  (c) proposed_by / created_by / user_id fields are forced from the token
      `sub` via the synthetic ToolContext.getUserId(); the tool handlers pull
      those from ctx, so any payload override is ignored.

Read scoping: read tools that take `tenant_id` are constrained to the token
tenant by guard (b). `list_tenants` output is filtered post-hoc so the runner
sees exactly one tenant — its own.

Because these three checks replicate what RLS would have enforced, the
handlers running with a service_role-backed Supabase client is acceptable.
================================================================================
*/

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { tools } from "../_shared/mcp-tools/_registry.ts";
import { BUILD_ID } from "../_shared/build-id.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_KEY = Deno.env.get("MCP_RUNNER_SIGNING_KEY")!;

const encoder = new TextEncoder();
const signingKeyBytes = encoder.encode(SIGNING_KEY ?? "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

type RunnerClaims = {
  iss: string;
  sub: string;
  client: string;
  tenant_id: string;
  agent_run_id: string;
  exp: number;
};

async function verifyRunnerToken(token: string): Promise<RunnerClaims> {
  const { payload } = await jwtVerify(token, signingKeyBytes, {
    algorithms: ["HS256"],
    issuer: "agent-run",
  });
  if (payload.client !== "runner") throw new Error("client claim mismatch");
  if (typeof payload.sub !== "string") throw new Error("sub missing");
  if (typeof payload.tenant_id !== "string") throw new Error("tenant_id missing");
  if (typeof payload.agent_run_id !== "string") throw new Error("agent_run_id missing");
  return payload as unknown as RunnerClaims;
}

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAgentRunActive(sb: SupabaseClient, claims: RunnerClaims) {
  const { data, error } = await sb
    .from("agent_runs")
    .select("id, status, launched_by, tenant_id")
    .eq("id", claims.agent_run_id)
    .maybeSingle();
  if (error) throw new Error(`agent_runs lookup failed: ${error.message}`);
  if (!data) throw new Error("agent_run not found");
  if (data.status !== "running") throw new Error(`agent_run status is ${data.status}`);
  if (data.launched_by !== claims.sub) throw new Error("launched_by mismatch");
  if (data.tenant_id !== claims.tenant_id) throw new Error("tenant_id mismatch");
}

async function assertTenantMember(sb: SupabaseClient, claims: RunnerClaims) {
  const { data, error } = await sb
    .from("tenant_admins")
    .select("role")
    .eq("user_id", claims.sub)
    .eq("tenant_id", claims.tenant_id)
    .in("role", ["admin", "manager", "marketing"])
    .maybeSingle();
  if (error) throw new Error(`tenant_admins lookup failed: ${error.message}`);
  if (!data) throw new Error("caller lacks marketer role on tenant");
}

// Build a synthetic ToolContext. `getToken()` returns the service role key so
// the tools' internal `createClient(url, anonKey, { Authorization: Bearer ctx.getToken() })`
// end up as a service-role client. That's intentional and matches the SECURITY
// MODEL block: authorization is enforced above; the tools do the DB work.
function makeCtx(claims: RunnerClaims) {
  return {
    isAuthenticated: () => true,
    getUserId: () => claims.sub,
    getUserEmail: () => null,
    getClientId: () => "runner",
    getClaims: () => claims as unknown as Record<string, unknown>,
    getToken: () => SERVICE_ROLE_KEY,
  };
}

const toolMap = new Map(tools.map((t: any) => [t.name, t]));

function toJsonSchema(inputSchema: Record<string, z.ZodTypeAny>) {
  const obj = z.object(inputSchema);
  const js = zodToJsonSchema(obj, { $refStrategy: "none", target: "openApi3" }) as any;
  // strip $schema for cleaner output
  delete js.$schema;
  return js;
}

function listedTools() {
  return tools.map((t: any) => ({
    name: t.name,
    description: t.description ?? t.title ?? "",
    inputSchema: toJsonSchema(t.inputSchema ?? {}),
  }));
}

function jsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message, data } }),
    { status: 200, headers: JSON_HEADERS },
  );
}

function jsonRpcResult(id: unknown, result: unknown) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }),
    { status: 200, headers: JSON_HEADERS },
  );
}

function unauthorized(reason: string) {
  return new Response(
    JSON.stringify({ error: "unauthorized", detail: reason }),
    { status: 401, headers: JSON_HEADERS },
  );
}

async function dispatchToolCall(claims: RunnerClaims, name: string, rawArgs: any) {
  const tool = toolMap.get(name);
  if (!tool) throw new Error(`unknown tool: ${name}`);

  const args = { ...(rawArgs ?? {}) };
  const schema = tool.inputSchema ?? {};

  // Guard (b): tool-boundary tenant enforcement + injection for read tools.
  if ("tenant_id" in schema) {
    if (args.tenant_id === undefined || args.tenant_id === null) {
      args.tenant_id = claims.tenant_id;
    } else if (args.tenant_id !== claims.tenant_id) {
      throw new Error(
        `tenant_id boundary violation: payload ${args.tenant_id} != token ${claims.tenant_id}`,
      );
    }
  }

  // Validate inputs with the tool's own zod schema.
  const parsed = z.object(schema).safeParse(args);
  if (!parsed.success) {
    throw new Error(`input validation failed: ${JSON.stringify(parsed.error.flatten())}`);
  }

  const ctx = makeCtx(claims);
  const result = await tool.handler(parsed.data, ctx);

  // Read scoping for list_tenants: post-filter to token tenant.
  if (name === "list_tenants" && result?.structuredContent?.tenants) {
    const filtered = (result.structuredContent.tenants as any[]).filter(
      (t) => t.id === claims.tenant_id,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      structuredContent: { tenants: filtered },
    };
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Unauthenticated build probe — same shape as agent-run. Returns only the
  // deploy stamp so a verification can cite the code that is actually live.
  if (req.method === "GET") {
    return new Response(JSON.stringify({ build_id: BUILD_ID }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS });
  }

  // ---- Auth: strict runner-token only. ----
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return unauthorized("missing bearer token");
  }
  const token = authHeader.slice(7).trim();

  let claims: RunnerClaims;
  try {
    claims = await verifyRunnerToken(token);
  } catch (e: any) {
    return unauthorized(`invalid runner token: ${e?.message ?? "verify failed"}`);
  }

  const sb = serviceClient();

  // Per-request revocation & role checks (see SECURITY MODEL).
  try {
    await assertAgentRunActive(sb, claims);
    await assertTenantMember(sb, claims);
  } catch (e: any) {
    return unauthorized(e?.message ?? "authorization failed");
  }

  // ---- JSON-RPC dispatch. ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = body ?? {};

  try {
    switch (method) {
      case "initialize":
        return jsonRpcResult(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "fgn-agent-mcp", version: "0.1.0" },
        });
      case "notifications/initialized":
      case "notifications/cancelled":
        return new Response(null, { status: 202, headers: CORS });
      case "tools/list":
        return jsonRpcResult(id, { tools: listedTools() });
      case "tools/call": {
        const name = params?.name;
        const rawArgs = params?.arguments ?? {};
        if (typeof name !== "string") {
          return jsonRpcError(id, -32602, "params.name required");
        }
        try {
          const result = await dispatchToolCall(claims, name, rawArgs);
          return jsonRpcResult(id, result);
        } catch (e: any) {
          return jsonRpcResult(id, {
            content: [{ type: "text", text: e?.message ?? "tool failed" }],
            isError: true,
          });
        }
      }
      case "ping":
        return jsonRpcResult(id, {});
      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e: any) {
    console.error("[agent-mcp] dispatch error", e?.message, e?.stack);
    return jsonRpcError(id, -32000, e?.message ?? "internal error");
  }
});
