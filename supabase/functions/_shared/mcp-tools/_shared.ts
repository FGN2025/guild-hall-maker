import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = ctx.getToken();
  // agent-mcp runner path: the synthetic ctx returns the service-role key
  // (which under the signing-keys system is a non-JWT `sb_secret_...` string
  // that supabase-js refuses to accept as a Bearer). Detect that case and
  // use the service key as apikey directly; authorization already enforced
  // upstream in agent-mcp (see SECURITY MODEL).
  if (svc && token === svc) {
    return createClient(url, svc, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseServiceRole(): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function requireAuth(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    return { content: [{ type: "text" as const, text: "Not authenticated" }], isError: true };
  }
  return null;
}

export function toolError(err: unknown, name: string) {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  console.error(`[fgn-mcp] ${name} failed`, msg);
  return { content: [{ type: "text" as const, text: msg || "tool execution failed" }], isError: true };
}

export function okJson<T>(payload: T, key: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: { [key]: payload } as Record<string, unknown>,
  };
}

/** Rejects offset-less ISO strings. Requires Z or ±HH:MM at end. */
export function parseIsoWithOffset(input: string): Date {
  const trimmed = input.trim();
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (!hasOffset) {
    throw new Error(
      `scheduled_at must be an ISO 8601 timestamp with an explicit timezone offset (e.g. 2026-07-24T14:00:00Z or 2026-07-24T14:00:00-05:00). Received: ${input}`,
    );
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO 8601 timestamp: ${input}`);
  }
  return d;
}
