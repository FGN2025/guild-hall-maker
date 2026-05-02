// QA test for verify-steam-task-completion edge function.
//
// This is a black-box test that stubs `globalThis.fetch` so it can intercept
// BOTH Supabase REST calls and Steam Web API calls. It boots the handler
// in-process and exercises:
//   1. Success: steam_achievement unlocked  -> auto-approved
//   2. Success: steam_playtime threshold met -> auto-approved
//   3. Failure: achievement not yet unlocked -> ok:false + progress message
//   4. Failure: Steam account not linked     -> ok:false
//   5. Failure: manual verification task     -> 400
//
// We do NOT need a live Supabase or Steam to run this — every external
// request is intercepted by the fetch stub below.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// --- Required env so the handler module loads cleanly ---
Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "stub-anon");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service");
Deno.env.set("STEAM_API_KEY", "stub-steam-key");

// --- Fixture data ---
const USER_ID = "00000000-0000-0000-0000-000000000001";
const ENROLLMENT_ID = "00000000-0000-0000-0000-000000000010";
const TASK_ACHIEVEMENT_ID = "00000000-0000-0000-0000-000000000020";
const TASK_PLAYTIME_ID = "00000000-0000-0000-0000-000000000021";
const TASK_MANUAL_ID = "00000000-0000-0000-0000-000000000022";
const CHALLENGE_ID = "00000000-0000-0000-0000-000000000030";
const GAME_ID = "00000000-0000-0000-0000-000000000040";
const STEAM_APP_ID = 730; // CS2
const STEAM_ID = "76561198000000000";
const ACHIEVEMENT = "WIN_FIRST_MATCH";

type Scenario = {
  task: "achievement" | "playtime" | "manual";
  achievementUnlocked?: boolean;
  playtimeMinutes?: number;
  steamLinked?: boolean;
};

let currentScenario: Scenario;
const originalFetch = globalThis.fetch;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pickTaskRow() {
  if (currentScenario.task === "achievement") {
    return {
      id: TASK_ACHIEVEMENT_ID,
      challenge_id: CHALLENGE_ID,
      title: "Win first match",
      verification_type: "steam_achievement",
      steam_achievement_api_name: ACHIEVEMENT,
      steam_playtime_minutes: null,
    };
  }
  if (currentScenario.task === "playtime") {
    return {
      id: TASK_PLAYTIME_ID,
      challenge_id: CHALLENGE_ID,
      title: "Play 60 minutes",
      verification_type: "steam_playtime",
      steam_achievement_api_name: null,
      steam_playtime_minutes: 60,
    };
  }
  return {
    id: TASK_MANUAL_ID,
    challenge_id: CHALLENGE_ID,
    title: "Manual",
    verification_type: "manual",
    steam_achievement_api_name: null,
    steam_playtime_minutes: null,
  };
}

// Intercept ALL outbound fetches: Supabase REST + Steam API + auth getClaims.
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  const method = (init?.method ?? "GET").toUpperCase();

  // --- Supabase auth: JWKS lookup (return empty so lib falls back to /user) ---
  if (url.includes("/auth/v1/.well-known/jwks.json") || url.includes("/auth/v1/jwks")) {
    return jsonResp({ keys: [] });
  }
  // --- Supabase auth getClaims fallback (calls /auth/v1/user) ---
  if (url.includes("/auth/v1/user")) {
    return jsonResp({ id: USER_ID, aud: "authenticated", role: "authenticated", email: "test@example.com" });
  }
  // --- Supabase auth settings ---
  if (url.includes("/auth/v1/settings")) {
    return jsonResp({});
  }

  // PostgREST: when supabase-js calls .single() / .maybeSingle() it sends
  // Accept: application/vnd.pgrst.object+json and expects a single object,
  // not an array. Detect and respond accordingly.
  const accept = new Headers(init?.headers ?? {}).get("Accept") ?? "";
  const wantsSingle = accept.includes("vnd.pgrst.object");
  const respond = (row: unknown) => jsonResp(wantsSingle ? row : [row]);

  // --- Supabase PostgREST table calls ---
  if (url.includes("/rest/v1/challenge_tasks")) {
    return respond(pickTaskRow());
  }
  if (url.includes("/rest/v1/challenges")) {
    return respond({ id: CHALLENGE_ID, game_id: GAME_ID });
  }
  if (url.includes("/rest/v1/games")) {
    return respond({ steam_app_id: STEAM_APP_ID, name: "CS2" });
  }
  if (url.includes("/rest/v1/challenge_enrollments")) {
    return respond({ id: ENROLLMENT_ID, user_id: USER_ID, status: "active" });
  }
  if (url.includes("/rest/v1/profiles")) {
    return respond({ steam_id: currentScenario.steamLinked === false ? null : STEAM_ID });
  }
  if (url.includes("/rest/v1/challenge_evidence")) {
    if (method === "GET") {
      // maybeSingle on no rows: return null object or empty array
      return wantsSingle ? jsonResp(null) : jsonResp([]);
    }
    if (method === "POST" || method === "PATCH") return jsonResp([{ id: "ev-1" }]);
  }
  if (
    url.includes("/rest/v1/steam_player_achievements") ||
    url.includes("/rest/v1/steam_player_playtime")
  ) {
    return jsonResp([]); // upserts succeed
  }

  // --- Steam Web API ---
  if (url.includes("ISteamUserStats/GetPlayerAchievements")) {
    return jsonResp({
      playerstats: {
        success: true,
        achievements: [
          {
            apiname: ACHIEVEMENT,
            achieved: currentScenario.achievementUnlocked ? 1 : 0,
            unlocktime: currentScenario.achievementUnlocked
              ? Math.floor(Date.now() / 1000)
              : 0,
          },
        ],
      },
    });
  }
  if (url.includes("IPlayerService/GetOwnedGames")) {
    return jsonResp({
      response: {
        games: [
          {
            appid: STEAM_APP_ID,
            playtime_forever: currentScenario.playtimeMinutes ?? 0,
          },
        ],
      },
    });
  }

  // Fallthrough — fail loudly so tests catch missed stubs.
  return new Response(`Unstubbed fetch: ${method} ${url}`, { status: 599 });
};

// Import the handler AFTER fetch is patched. The module calls Deno.serve(),
// so we intercept that to capture the handler instead of binding a port.
let captured: ((req: Request) => Promise<Response> | Response) | null = null;
const originalServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (handler: any) => {
  captured = handler;
  return { finished: Promise.resolve(), shutdown: () => {}, ref: () => {}, unref: () => {} } as unknown as ReturnType<typeof originalServe>;
};
await import("./index.ts");
// deno-lint-ignore no-explicit-any
(Deno as any).serve = originalServe;

if (!captured) throw new Error("Handler was not registered via Deno.serve");
// deno-lint-ignore no-explicit-any
const handler: (req: Request) => Promise<Response> | Response = captured as any;

// Build a structurally valid (unsigned) JWT so supabase-js can decode it.
// Local verification will fail (no JWKS match) and the lib will fall back
// to /auth/v1/user, which our fetch stub answers.
function makeFakeJwt() {
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const header = enc({ alg: "HS256", typ: "JWT", kid: "stub" });
  const payload = enc({
    sub: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    iss: "https://stub.supabase.co/auth/v1",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
  return `${header}.${payload}.stub-signature`;
}
const FAKE_JWT = makeFakeJwt();

function call(taskId: string) {
  return handler(
    new Request("http://localhost/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FAKE_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, enrollmentId: ENROLLMENT_ID }),
    }),
  );
}

Deno.test({ name: "Steam achievement unlocked -> auto-approved", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "achievement", achievementUnlocked: true, steamLinked: true };
  const res = await call(TASK_ACHIEVEMENT_ID);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.autoApproved, true);
}});

Deno.test({ name: "Steam achievement NOT unlocked -> failure with progress", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "achievement", achievementUnlocked: false, steamLinked: true };
  const res = await call(TASK_ACHIEVEMENT_ID);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, false);
  assertEquals(typeof body.reason, "string");
}});

Deno.test({ name: "Steam playtime threshold met -> auto-approved", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "playtime", playtimeMinutes: 120, steamLinked: true };
  const res = await call(TASK_PLAYTIME_ID);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assertEquals(body.autoApproved, true);
}});

Deno.test({ name: "Steam playtime below threshold -> failure", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "playtime", playtimeMinutes: 10, steamLinked: true };
  const res = await call(TASK_PLAYTIME_ID);
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ok, false);
}});

Deno.test({ name: "Steam account not linked -> failure", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "achievement", achievementUnlocked: true, steamLinked: false };
  const res = await call(TASK_ACHIEVEMENT_ID);
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.ok, false);
  assertEquals(body.reason, "Steam account not linked");
}});

Deno.test({ name: "Manual task rejects Steam verification call", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  currentScenario = { task: "manual", steamLinked: true };
  const res = await call(TASK_MANUAL_ID);
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.ok, false);
}});

// Restore fetch when all tests done (best-effort).
addEventListener("unload", () => {
  globalThis.fetch = originalFetch;
});
