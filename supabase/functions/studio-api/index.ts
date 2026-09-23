// FGN Studio partner read API — read-only, organization-scoped, cursor paginated.
// No route in this function mutates catalog content.
import { createClient } from "npm:@supabase/supabase-js@2";
import { CONTRACT_VERSION, CAPABILITIES, OPENAPI_DOC } from "./contract.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CURSOR_SECRET = Deno.env.get("STUDIO_CURSOR_SECRET") ?? "";

const TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/* ───────── helpers ───────── */

const admin = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const enc = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(CURSOR_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const b64url = (s: string) =>
  btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) =>
  atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));

function randomToken(prefix: string): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return prefix + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ───────── CORS ───────── */

const BASE_CORS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-studio-contract, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

async function corsFor(origin: string | null): Promise<Record<string, string>> {
  if (!origin) return { ...BASE_CORS };
  const { data } = await admin()
    .from("app_settings")
    .select("value")
    .eq("key", "studio_allowed_origins")
    .maybeSingle();
  const allowed = (data?.value ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) {
    return { ...BASE_CORS, "Access-Control-Allow-Origin": origin };
  }
  return { ...BASE_CORS };
}

/* ───────── responses ───────── */

type Ctx = {
  cors: Record<string, string>;
};

function json(ctx: Ctx, status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...ctx.cors,
      ...extra,
      "Content-Type": "application/json",
      "X-Studio-Contract": CONTRACT_VERSION,
      "Cache-Control": "no-store",
    },
  });
}

/* ───────── credential resolution ───────── */

type Credential = {
  keyId: string;
  tenantId: string;
  capabilities: string[];
  includeInactive: boolean;
  rateLimitPerMinute: number;
  via: "key" | "token";
};

type AuthResult = { ok: true; cred: Credential } | { ok: false; status: number; error: string };

async function resolveCredential(req: Request, allowKey: boolean, allowToken: boolean): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer credential" };
  }
  const raw = header.slice(7).trim();
  if (!raw) return { ok: false, status: 401, error: "Missing bearer credential" };

  const db = admin();
  const hash = await sha256Hex(raw);
  const now = new Date();

  const isToken = raw.startsWith("fgnt_");
  if (isToken) {
    if (!allowToken) return { ok: false, status: 401, error: "This route requires a durable partner key" };
    const { data: tok } = await db
      .from("partner_access_tokens")
      .select("id, key_id, expires_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (!tok) return { ok: false, status: 401, error: "Invalid credential" };
    if (new Date(tok.expires_at) <= now) {
      return { ok: false, status: 401, error: "Token expired" };
    }
    const keyRow = await loadKey(db, tok.key_id);
    if (!keyRow.ok) return keyRow;
    return { ok: true, cred: { ...keyRow.cred, via: "token" } };
  }

  if (!allowKey) return { ok: false, status: 401, error: "This route requires a short-lived token" };
  const { data: key } = await db
    .from("partner_api_keys")
    .select("id")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!key) return { ok: false, status: 401, error: "Invalid credential" };
  const keyRow = await loadKey(db, key.id);
  if (!keyRow.ok) return keyRow;
  return { ok: true, cred: { ...keyRow.cred, via: "key" } };
}

async function loadKey(db: ReturnType<typeof admin>, keyId: string): Promise<AuthResult> {
  const { data } = await db
    .from("partner_api_keys")
    .select("id, tenant_id, capabilities, include_inactive, rate_limit_per_minute, expires_at, revoked_at")
    .eq("id", keyId)
    .maybeSingle();
  if (!data) return { ok: false, status: 401, error: "Invalid credential" };
  if (data.revoked_at) return { ok: false, status: 401, error: "Credential revoked" };
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return { ok: false, status: 401, error: "Credential expired" };
  }
  return {
    ok: true,
    cred: {
      keyId: data.id,
      tenantId: data.tenant_id,
      capabilities: data.capabilities ?? [],
      includeInactive: data.include_inactive ?? true,
      rateLimitPerMinute: data.rate_limit_per_minute ?? 120,
      via: "key",
    },
  };
}

async function touchKey(keyId: string) {
  await admin().from("partner_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyId);
}

async function rateLimited(cred: Credential): Promise<boolean> {
  const db = admin();
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  const { data } = await db
    .from("partner_request_counters")
    .select("request_count")
    .eq("key_id", cred.keyId)
    .eq("window_start", windowStart)
    .maybeSingle();
  const count = (data?.request_count ?? 0) + 1;
  await db
    .from("partner_request_counters")
    .upsert({ key_id: cred.keyId, window_start: windowStart, request_count: count });
  return count > cred.rateLimitPerMinute;
}

/* ───────── revisions ───────── */

async function revisionFor(scopeKey: string): Promise<number> {
  const { data } = await admin()
    .from("catalog_revisions")
    .select("revision")
    .eq("scope_key", scopeKey)
    .maybeSingle();
  return Number(data?.revision ?? 0);
}

/* ───────── cursors ───────── */

type CursorPayload = {
  t: string; // created_at of last row
  i: string; // id of last row
  q: string; // query fingerprint
  s: string; // organization scope
  r: number; // revision the walk started at
};

async function encodeCursor(p: CursorPayload): Promise<string> {
  const body = b64url(JSON.stringify(p));
  const sig = await hmacHex(body);
  return `${body}.${sig}`;
}

type CursorResult =
  | { ok: true; payload: CursorPayload | null }
  | { ok: false; error: string };

async function decodeCursor(
  cursor: string | null,
  fingerprint: string,
  tenantId: string,
): Promise<CursorResult> {
  if (!cursor) return { ok: true, payload: null };
  const parts = cursor.split(".");
  if (parts.length !== 2) return { ok: false, error: "Malformed cursor" };
  const [body, sig] = parts;
  const expected = await hmacHex(body);
  if (sig !== expected) return { ok: false, error: "Cursor signature invalid" };
  let payload: CursorPayload;
  try {
    payload = JSON.parse(unb64url(body));
  } catch {
    return { ok: false, error: "Malformed cursor" };
  }
  if (payload.q !== fingerprint) return { ok: false, error: "Cursor does not belong to this query" };
  if (payload.s !== tenantId) return { ok: false, error: "Cursor does not belong to this organization scope" };
  return { ok: true, payload };
}

function parseLimit(url: URL): number {
  const raw = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_LIMIT);
}

// Keyset pagination on (created_at, id) ascending — deterministic forward progress.
function applyKeyset(q: any, after: CursorPayload | null) {
  if (!after) return q;
  return q.or(`created_at.gt.${after.t},and(created_at.eq.${after.t},id.gt.${after.i})`);
}

/* ───────── handler ───────── */

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = await corsFor(origin);
  const ctx: Ctx = { cors };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const base = segments.indexOf("studio-api");
  const route = base >= 0 ? segments.slice(base + 1) : segments;
  const head = route[0] ?? "";

  // Unauthenticated machine-readable contract
  if (head === "openapi.json") {
    if (req.method !== "GET") return json(ctx, 405, { error: "Method not allowed" });
    return json(ctx, 200, OPENAPI_DOC);
  }

  // Contract version gate
  const sent = req.headers.get("x-studio-contract");
  if (sent !== CONTRACT_VERSION) {
    return json(ctx, 409, {
      error: sent ? "Contract version mismatch" : "Missing X-Studio-Contract header",
      sentContractVersion: sent,
      supportedContractVersions: [CONTRACT_VERSION],
    });
  }

  try {
    /* ── token exchange (durable key only; mutates no catalog content) ── */
    if (head === "token") {
      if (req.method !== "POST") return json(ctx, 405, { error: "Method not allowed" });
      const auth = await resolveCredential(req, true, false);
      if (!auth.ok) return json(ctx, auth.status, { error: auth.error });
      if (await rateLimited(auth.cred)) return json(ctx, 429, { error: "Rate limit exceeded" });

      const token = randomToken("fgnt_");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
      const { error } = await admin().from("partner_access_tokens").insert({
        key_id: auth.cred.keyId,
        token_hash: await sha256Hex(token),
        expires_at: expiresAt,
      });
      if (error) return json(ctx, 500, { error: "Could not issue token" });
      await admin()
        .from("partner_access_tokens")
        .delete()
        .lt("expires_at", new Date(Date.now() - 86_400_000).toISOString());
      await touchKey(auth.cred.keyId);

      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        token,
        tokenType: "Bearer",
        expiresAt,
        expiresInSeconds: TOKEN_TTL_SECONDS,
        organizationId: auth.cred.tenantId,
        capabilities: auth.cred.capabilities,
      });
    }

    /* ── every catalog route is GET-only ── */
    if (req.method !== "GET") {
      return json(ctx, 405, { error: "This API is read-only; only GET is accepted" });
    }

    const auth = await resolveCredential(req, true, true);
    if (!auth.ok) return json(ctx, auth.status, { error: auth.error });
    const cred = auth.cred;

    if (await rateLimited(cred)) return json(ctx, 429, { error: "Rate limit exceeded" });
    await touchKey(cred.keyId);

    // Caller-supplied organization ids are a filter, never an authorization.
    const requestedOrg =
      url.searchParams.get("organizationId") ?? url.searchParams.get("tenantId");
    if (requestedOrg && requestedOrg !== cred.tenantId) {
      return json(ctx, 403, { error: "Credential is not scoped to the requested organization" });
    }

    const db = admin();
    const globalRevision = await revisionFor("global");

    const requireCap = (cap: string) =>
      cred.capabilities.includes(cap)
        ? null
        : json(ctx, 403, { error: `Credential lacks capability ${cap}`, capabilities: cred.capabilities });

    /* ── /capabilities ── */
    if (head === "capabilities" || head === "") {
      const { data: tenant } = await db
        .from("tenants")
        .select("id, name, slug")
        .eq("id", cred.tenantId)
        .maybeSingle();
      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        authenticated: true,
        credentialType: cred.via === "token" ? "short_lived_token" : "durable_key",
        tenantId: cred.tenantId,
        tenantLabel: tenant?.name ?? null,
        tenantSlug: tenant?.slug ?? null,
        capabilities: cred.capabilities,
        includesInactiveRecords: cred.includeInactive,
        catalogScope:
          "Games, challenges, tasks and canonical simulation activities are platform-global records, visible to every authorized organization and flagged scope=global. Organization-owned records are flagged scope=organization and only the credential's organization can see them.",
        revision: globalRevision,
        pagination: { style: "cursor", defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT },
      });
    }

    /* ── /sources ── */
    if (head === "sources") {
      const denied = requireCap(CAPABILITIES.CATALOG);
      if (denied) return denied;

      const limit = parseLimit(url);
      const fingerprint = await sha256Hex(`sources|${cred.includeInactive}`);
      const cur = await decodeCursor(url.searchParams.get("cursor"), fingerprint, cred.tenantId);
      if (!cur.ok) return json(ctx, 400, { error: cur.error });

      let q = db
        .from("games")
        .select("id, name, slug, is_active, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit + 1);
      q = applyKeyset(q, cur.payload);
      const { data, error } = await q;
      if (error) return json(ctx, 500, { error: error.message });

      const page = (data ?? []).slice(0, limit);
      const items = [];
      for (const g of page) {
        let countQ = db
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("game_id", g.id);
        if (!cred.includeInactive) countQ = countQ.eq("is_active", true);
        const { count } = await countQ;
        items.push({
          sourceId: g.id,
          label: g.name,
          slug: g.slug,
          isActive: g.is_active,
          scope: "global",
          sourceVersion: await revisionFor(`game:${g.id}`),
          challengeCount: count ?? 0,
        });
      }

      const last = page[page.length - 1];
      const nextCursor =
        (data ?? []).length > limit && last
          ? await encodeCursor({
              t: last.created_at,
              i: last.id,
              q: fingerprint,
              s: cred.tenantId,
              r: cur.payload?.r ?? globalRevision,
            })
          : null;

      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        revision: globalRevision,
        revisionChanged: cur.payload ? cur.payload.r !== globalRevision : false,
        items,
        nextCursor,
      });
    }

    /* ── /challenges and /challenges/{id} ── */
    if (head === "challenges") {
      const denied = requireCap(CAPABILITIES.CATALOG);
      if (denied) return denied;

      const challengeSelect =
        "id, name, description, is_active, track, challenge_type, difficulty, points_reward, xp_reward, estimated_minutes, requires_evidence, content_classification, simulation_activity_id, academy_next_step_url, academy_next_step_label, game_id, start_date, end_date, created_at, updated_at";

      const expand = async (rows: any[]) => {
        const ids = rows.map((r) => r.id);
        let tasks: any[] = [];
        if (ids.length) {
          const { data: t } = await db
            .from("challenge_tasks")
            .select(
              "id, challenge_id, title, description, display_order, verification_type, created_at",
            )
            .in("challenge_id", ids)
            .order("display_order", { ascending: true });
          tasks = t ?? [];
        }
        return rows.map((c) => ({
          challengeId: c.id,
          name: c.name,
          description: c.description,
          isActive: c.is_active,
          kind: c.track ?? c.challenge_type ?? null,
          difficulty: c.difficulty,
          points: c.points_reward,
          xp: c.xp_reward,
          estimatedMinutes: c.estimated_minutes,
          requiresEvidence: c.requires_evidence,
          contentClassification: c.content_classification,
          canonicalActivityId: c.simulation_activity_id,
          academyRelationship: c.academy_next_step_url
            ? { label: c.academy_next_step_label, url: c.academy_next_step_url }
            : null,
          sourceId: c.game_id,
          scope: "global",
          startDate: c.start_date,
          endDate: c.end_date,
          updatedAt: c.updated_at,
          taskIds: tasks.filter((t) => t.challenge_id === c.id).map((t) => t.id),
          tasks: tasks
            .filter((t) => t.challenge_id === c.id)
            .map((t) => ({
              taskId: t.id,
              title: t.title,
              description: t.description,
              order: t.display_order,
              verificationType: t.verification_type,
              taskVersion: t.created_at,
            })),
        }));
      };

      if (route[1]) {
        const { data, error } = await db
          .from("challenges")
          .select(challengeSelect)
          .eq("id", route[1])
          .maybeSingle();
        if (error) return json(ctx, 500, { error: error.message });
        if (!data || (!cred.includeInactive && !data.is_active)) {
          return json(ctx, 404, { error: "Challenge not found" });
        }
        const [item] = await expand([data]);
        return json(ctx, 200, {
          contractVersion: CONTRACT_VERSION,
          revision: globalRevision,
          sourceVersion: await revisionFor(`game:${data.game_id}`),
          item,
        });
      }

      const sourceId = url.searchParams.get("sourceId");
      const limit = parseLimit(url);
      const fingerprint = await sha256Hex(`challenges|${sourceId ?? "*"}|${cred.includeInactive}`);
      const cur = await decodeCursor(url.searchParams.get("cursor"), fingerprint, cred.tenantId);
      if (!cur.ok) return json(ctx, 400, { error: cur.error });

      let q = db
        .from("challenges")
        .select(challengeSelect)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit + 1);
      if (sourceId) q = q.eq("game_id", sourceId);
      if (!cred.includeInactive) q = q.eq("is_active", true);
      q = applyKeyset(q, cur.payload);

      const { data, error } = await q;
      if (error) return json(ctx, 500, { error: error.message });
      const page = (data ?? []).slice(0, limit);
      const last = page[page.length - 1];
      const nextCursor =
        (data ?? []).length > limit && last
          ? await encodeCursor({
              t: last.created_at,
              i: last.id,
              q: fingerprint,
              s: cred.tenantId,
              r: cur.payload?.r ?? globalRevision,
            })
          : null;

      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        revision: globalRevision,
        sourceVersion: sourceId ? await revisionFor(`game:${sourceId}`) : null,
        revisionChanged: cur.payload ? cur.payload.r !== globalRevision : false,
        includesInactiveRecords: cred.includeInactive,
        items: await expand(page),
        nextCursor,
      });
    }

    /* ── /activities and /activities/{id} ── */
    if (head === "activities") {
      const denied = requireCap(CAPABILITIES.ACTIVITIES);
      if (denied) return denied;

      const activitySelect =
        "id, canonical_name, canonical_slug, canonical_description, game_id, game_version, activity_category, industry_domain, status, provenance, schema_version, created_at, updated_at";

      const shape = async (rows: any[]) => {
        const ids = rows.map((r) => r.id);
        let links: any[] = [];
        if (ids.length) {
          const { data: l } = await db
            .from("simulation_activity_challenges")
            .select("simulation_activity_id, challenge_id, challenge_task_id, is_primary, mapping_status")
            .in("simulation_activity_id", ids);
          links = l ?? [];
        }
        return rows.map((a) => ({
          activityId: a.id,
          name: a.canonical_name,
          slug: a.canonical_slug,
          actionDescription: a.canonical_description,
          sourceId: a.game_id,
          gameVersion: a.game_version,
          category: a.activity_category,
          industryDomain: a.industry_domain,
          status: a.status,
          provenance: a.provenance,
          schemaVersion: a.schema_version,
          scope: "global",
          updatedAt: a.updated_at,
          variantChallengeIds: [
            ...new Set(
              links.filter((l) => l.simulation_activity_id === a.id).map((l) => l.challenge_id),
            ),
          ],
          mappings: links
            .filter((l) => l.simulation_activity_id === a.id)
            .map((l) => ({
              challengeId: l.challenge_id,
              taskId: l.challenge_task_id,
              isPrimary: l.is_primary,
              mappingStatus: l.mapping_status,
            })),
        }));
      };

      if (route[1]) {
        const { data, error } = await db
          .from("simulation_activities")
          .select(activitySelect)
          .eq("id", route[1])
          .maybeSingle();
        if (error) return json(ctx, 500, { error: error.message });
        if (!data) return json(ctx, 404, { error: "Activity not found" });
        const [item] = await shape([data]);
        return json(ctx, 200, { contractVersion: CONTRACT_VERSION, revision: globalRevision, item });
      }

      const limit = parseLimit(url);
      const fingerprint = await sha256Hex(`activities|${cred.includeInactive}`);
      const cur = await decodeCursor(url.searchParams.get("cursor"), fingerprint, cred.tenantId);
      if (!cur.ok) return json(ctx, 400, { error: cur.error });

      let q = db
        .from("simulation_activities")
        .select(activitySelect)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit + 1);
      if (!cred.includeInactive) q = q.eq("status", "active");
      q = applyKeyset(q, cur.payload);

      const { data, error } = await q;
      if (error) return json(ctx, 500, { error: error.message });
      const page = (data ?? []).slice(0, limit);
      const last = page[page.length - 1];
      const nextCursor =
        (data ?? []).length > limit && last
          ? await encodeCursor({
              t: last.created_at,
              i: last.id,
              q: fingerprint,
              s: cred.tenantId,
              r: cur.payload?.r ?? globalRevision,
            })
          : null;

      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        revision: globalRevision,
        revisionChanged: cur.payload ? cur.payload.r !== globalRevision : false,
        items: await shape(page),
        nextCursor,
      });
    }

    /* ── /work-order-relationships ── */
    if (head === "work-order-relationships") {
      const denied = requireCap(CAPABILITIES.RELATIONSHIPS);
      if (denied) return denied;

      const idsParam = url.searchParams.get("activityIds");
      const activityIds = (idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const limit = parseLimit(url);

      let q = db
        .from("simulation_activity_challenges")
        .select("id, simulation_activity_id, challenge_id, challenge_task_id, mapping_status, is_primary, created_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(limit + 1);
      if (activityIds.length) q = q.in("simulation_activity_id", activityIds);

      const fingerprint = await sha256Hex(`relationships|${activityIds.sort().join(",")}`);
      const cur = await decodeCursor(url.searchParams.get("cursor"), fingerprint, cred.tenantId);
      if (!cur.ok) return json(ctx, 400, { error: cur.error });
      q = applyKeyset(q, cur.payload);

      const { data, error } = await q;
      if (error) return json(ctx, 500, { error: error.message });
      const page = (data ?? []).slice(0, limit);

      const challengeIds = [...new Set(page.map((r) => r.challenge_id))];
      let challenges: any[] = [];
      if (challengeIds.length) {
        const { data: c } = await db
          .from("challenges")
          .select("id, name, academy_next_step_url, academy_next_step_label")
          .in("id", challengeIds);
        challenges = c ?? [];
      }

      const last = page[page.length - 1];
      const nextCursor =
        (data ?? []).length > limit && last
          ? await encodeCursor({
              t: last.created_at,
              i: last.id,
              q: fingerprint,
              s: cred.tenantId,
              r: cur.payload?.r ?? globalRevision,
            })
          : null;

      return json(ctx, 200, {
        contractVersion: CONTRACT_VERSION,
        revision: globalRevision,
        revisionChanged: cur.payload ? cur.payload.r !== globalRevision : false,
        authority:
          "FGN.GG publishes the relationships it holds. FGN Academy remains authoritative for its own work-order definitions and maturity.",
        items: page.map((r) => {
          const c = challenges.find((x) => x.id === r.challenge_id);
          return {
            activityId: r.simulation_activity_id,
            challengeId: r.challenge_id,
            taskId: r.challenge_task_id,
            isPrimary: r.is_primary,
            mappingStatus: r.mapping_status,
            workOrderId: null,
            title: c?.academy_next_step_label ?? c?.name ?? null,
            maturity: r.mapping_status === "matched" ? "confirmed" : "provisional",
            externalReference: c?.academy_next_step_url ?? null,
          };
        }),
        nextCursor,
      });
    }

    return json(ctx, 404, { error: `Unknown route: /${route.join("/")}` });
  } catch (err: any) {
    console.error("[studio-api] failure", err?.message);
    return json(ctx, 500, { error: "Internal error" });
  }
});
