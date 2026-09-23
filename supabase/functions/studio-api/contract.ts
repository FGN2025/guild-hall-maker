// Machine-readable contract for the FGN Studio partner read API.
// Keep CONTRACT_VERSION in sync with docs/studio-api.openapi.yaml.

export const CONTRACT_VERSION = "2026-09-23.1";

export const CAPABILITIES = {
  CATALOG: "catalog:read",
  ACTIVITIES: "activities:read",
  RELATIONSHIPS: "relationships:read",
} as const;

export const ALL_CAPABILITIES = [
  CAPABILITIES.CATALOG,
  CAPABILITIES.ACTIVITIES,
  CAPABILITIES.RELATIONSHIPS,
];

export const OPENAPI_DOC = {
  openapi: "3.1.0",
  info: {
    title: "FGN.GG Studio Read API",
    version: CONTRACT_VERSION,
    description:
      "Read-only catalog access for authorized partner tooling. Organization-scoped credentials, cursor pagination, revision-based stale detection. No write routes exist.",
  },
  servers: [
    { url: "https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/studio-api" },
  ],
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer" },
    },
    parameters: {
      contract: {
        name: "X-Studio-Contract",
        in: "header",
        required: true,
        schema: { type: "string" },
        description: `Must equal ${CONTRACT_VERSION}. A mismatch returns 409.`,
      },
      cursor: { name: "cursor", in: "query", schema: { type: "string" } },
      limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
    },
  },
  security: [{ bearer: [] }],
  paths: {
    "/token": {
      post: {
        summary:
          "Exchange a durable partner key (server-side only) for a short-lived organization-scoped token.",
        responses: {
          "200": { description: "token, tokenType, expiresAt, organizationId, capabilities" },
          "401": { description: "absent, invalid, expired or revoked key" },
          "409": { description: "contract version mismatch" },
          "429": { description: "rate limited" },
        },
      },
    },
    "/capabilities": {
      get: {
        summary: "Capability discovery, organization scope, contract version, current revision.",
        responses: { "200": { description: "capability document" }, "401": {}, "409": {} },
      },
    },
    "/sources": {
      get: {
        summary: "Catalog sources (games) with per-source revision and challenge count.",
        responses: { "200": {}, "401": {}, "403": {}, "409": {}, "429": {} },
      },
    },
    "/challenges": {
      get: {
        summary:
          "Challenges with description, state, points and fully expanded ordered task objects.",
        responses: { "200": {}, "400": { description: "invalid cursor" }, "401": {}, "403": {}, "409": {} },
      },
    },
    "/challenges/{challengeId}": {
      get: { summary: "One challenge with its ordered tasks.", responses: { "200": {}, "404": {} } },
    },
    "/activities": {
      get: { summary: "Canonical simulation activities.", responses: { "200": {} } },
    },
    "/activities/{activityId}": {
      get: { summary: "One canonical simulation activity by id.", responses: { "200": {}, "404": {} } },
    },
    "/work-order-relationships": {
      get: {
        summary:
          "Activity to downstream-work relationships held by FGN.GG. FGN Academy remains authoritative for its own work orders.",
        responses: { "200": {} },
      },
    },
    "/openapi.json": {
      get: { summary: "This document. Unauthenticated.", security: [], responses: { "200": {} } },
    },
  },
};
