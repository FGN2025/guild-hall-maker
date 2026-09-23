// Machine-readable contract for the FGN Studio partner read API.
// Keep CONTRACT_VERSION and OPENAPI_DOC in sync with docs/studio-api.openapi.yaml.

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

const BASE_URL = "https://yrhwzmkenjgiujhofucx.supabase.co/functions/v1/studio-api";

const errorSchema = {
  type: "object",
  required: ["error"],
  properties: {
    error: { type: "string" },
    capabilities: {
      type: "array",
      items: { type: "string" },
      description: "Present on 403 capability denials: what the credential actually holds.",
    },
    sentContractVersion: { type: ["string", "null"] },
    supportedContractVersions: { type: "array", items: { type: "string" } },
  },
};

const pageEnvelope = {
  contractVersion: { type: "string", const: CONTRACT_VERSION },
  revision: {
    type: "integer",
    description:
      "Global catalog revision at the time this page was read. Bumped by database triggers on insert, update and delete of challenges, challenge tasks, canonical activities and activity-challenge mappings.",
  },
  revisionChanged: {
    type: "boolean",
    description:
      "True when the global revision moved since the walk began (only meaningful on pages fetched with a cursor). Restart the walk rather than merging two snapshots.",
  },
  nextCursor: {
    type: ["string", "null"],
    description:
      "Opaque signed cursor for the next page. Null only at true exhaustion; a non-null value on an abandoned walk means the read is incomplete, never complete.",
  },
};

export const OPENAPI_DOC = {
  openapi: "3.1.0",
  info: {
    title: "FGN.GG Studio Read API",
    version: CONTRACT_VERSION,
    description: [
      "Read-only catalog access for authorized partner tooling (FGN Studio).",
      "",
      "Authentication: two layers. A durable partner key (prefix `fgnk_`) lives only on an operator-owned server and is exchanged at POST /token for a short-lived organization-scoped token (prefix `fgnt_`, 15 minutes) which is the only credential a browser may hold. Both are sent as `Authorization: Bearer <value>`.",
      "",
      "Every request except `GET /openapi.json` and `OPTIONS` preflight must carry `X-Studio-Contract: " +
        CONTRACT_VERSION +
        "`; a missing or mismatched value returns 409 with no data. `GET /openapi.json` and `OPTIONS` require neither credential nor contract header.",
      "",
      "Organization scope is taken from the credential and enforced server-side. A caller-supplied `organizationId`/`tenantId` query parameter is a filter only; if it differs from the credential's organization the request returns 403. Ids are stable server-issued UUIDs; no `local:`, `proposal:` or `sim-` prefixed identifier is ever returned.",
      "",
      "No write route exists. Catalog routes accept GET only and return 405 otherwise. POST /token mutates no catalog content.",
    ].join("\n"),
  },
  servers: [
    {
      url: BASE_URL,
      description:
        "The only real base path. There is no api.fgn.gg host and play.fgn.gg serves the player web app only.",
    },
  ],
  security: [{ bearer: [] }],
  "x-verifiedAgainstDeployedService": {
    lastRun: "2026-09-23",
    note:
      "Each behaviour below was exercised against this deployed service with throwaway organization-scoped credentials that were deleted afterwards. Behaviours not listed are specified but not separately exercised.",
    verified: [
      "GET /openapi.json returns 200 with no credential and no contract header",
      "OPTIONS preflight returns 200 with no credential and no contract header",
      "Catalog request without X-Studio-Contract returns 409 listing supportedContractVersions and no data",
      "Catalog request with a wrong contract version returns 409",
      "Catalog request with the contract header but no credential returns 401",
      "Invalid credential returns 401",
      "Valid credential returns 200 with its organization and capability list",
      "POST on a catalog route returns 405 (read-only boundary)",
      "Request naming another organization returns 403 'Credential is not scoped to the requested organization'",
      "Credential lacking activities:read receives 403 on /activities",
      "POST /token with a durable key returns a 15-minute fgnt_ token carrying the key's organization and capabilities",
      "A fgnt_ token presented to /token returns 401 (only durable keys may exchange)",
      "Token used on a catalog route returns 200",
      "Challenge payloads carry description plus fully expanded ordered task objects with stable ids",
      "Inactive visibility on: inactive records returned and flagged; off: omitted, with includesInactiveRecords false stated in the payload",
      "Pagination to exhaustion: 13 pages at limit 10, 127 unique ids, no duplicates, nextCursor null only at the end",
      "Replayed cursor returns the identical page and cannot loop",
      "Interrupted walk still carries a nextCursor, so an incomplete read is detectable",
      "Tampered cursor returns 400; cursor reused on a different query returns 400; cursor reused by another organization returns 400",
      "Activities list and single-id lookup return 200",
      "Work-order relationships return 200 including the Academy authority note",
      "Revision increments on insert, on update and on delete",
      "revisionChanged is true when the catalog moves mid-walk",
      "Rate limiting: requests within the per-key limit return 200, the next requests return 429",
      "Revoked key returns 401 'Credential revoked', and a token minted before revocation returns 401 immediately after",
      "CORS preflight from an unapproved origin returns no Access-Control-Allow-Origin",
    ],
  },
  tags: [
    { name: "discovery", description: "Unauthenticated contract discovery." },
    { name: "auth", description: "Credential exchange." },
    { name: "catalog", description: "Read-only catalog routes." },
  ],
  components: {
    securitySchemes: {
      bearer: {
        type: "http",
        scheme: "bearer",
        description:
          "Durable partner key `fgnk_…` (server-side only; accepted on /token and on catalog routes) or short-lived token `fgnt_…` from /token (catalog routes only). A `fgnt_` token presented to /token returns 401: only durable keys may mint tokens.",
      },
    },
    parameters: {
      contract: {
        name: "X-Studio-Contract",
        in: "header",
        required: true,
        schema: { type: "string", const: CONTRACT_VERSION },
        example: CONTRACT_VERSION,
        description: `Must equal ${CONTRACT_VERSION}. Missing or different → 409, body lists supportedContractVersions and carries no catalog data.`,
      },
      cursor: {
        name: "cursor",
        in: "query",
        required: false,
        schema: { type: "string" },
        description:
          "Opaque HMAC-signed cursor copied verbatim from the previous page's nextCursor. Carries the last ordering tuple, a fingerprint of the query, the credential's organization scope and the revision the walk began at. A tampered, unsigned, cross-query or cross-organization cursor is rejected with 400. Replaying a cursor re-reads the same page and can never loop, because the keyset strictly advances.",
      },
      limit: {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
        description:
          "Page size. Values below 1 or above 200 are clamped rather than rejected. Ordering is always created_at ascending, then id ascending.",
      },
      sourceId: {
        name: "sourceId",
        in: "query",
        required: false,
        schema: { type: "string", format: "uuid" },
        description: "Restrict challenges to one source (game).",
      },
      organizationId: {
        name: "organizationId",
        in: "query",
        required: false,
        schema: { type: "string", format: "uuid" },
        description:
          "Optional filter only, never authorization. Alias: tenantId. If it differs from the credential's organization the request returns 403.",
      },
    },
    responses: {
      Unauthorized: {
        description: [
          "Credential absent, malformed, invalid, expired or revoked. Exact `error` values:",
          "`Missing bearer credential`, `Invalid credential`, `Token expired`, `Credential expired`, `Credential revoked`,",
          "`This route requires a durable partner key` (a fgnt_ token was sent to /token).",
          "Revoking a durable key invalidates it and every token minted from it immediately.",
        ].join(" "),
        content: {
          "application/json": {
            schema: errorSchema,
            examples: {
              revoked: { value: { error: "Credential revoked" } },
              expiredToken: { value: { error: "Token expired" } },
            },
          },
        },
      },
      Forbidden: {
        description:
          "Organization scope violation or missing capability. The credential is valid; the request is not permitted.",
        content: {
          "application/json": {
            schema: errorSchema,
            examples: {
              wrongOrganization: {
                value: { error: "Credential is not scoped to the requested organization" },
              },
              missingCapability: {
                value: {
                  error: "Credential lacks capability activities:read",
                  capabilities: ["catalog:read"],
                },
              },
            },
          },
        },
      },
      Conflict: {
        description:
          "Contract header missing or mismatched. No catalog data is returned. Retrying with the same header will always fail; resend with a supported version.",
        content: {
          "application/json": {
            schema: errorSchema,
            examples: {
              missing: {
                value: {
                  error: "Missing X-Studio-Contract header",
                  sentContractVersion: null,
                  supportedContractVersions: [CONTRACT_VERSION],
                },
              },
              mismatch: {
                value: {
                  error: "Contract version mismatch",
                  sentContractVersion: "2026-01-01.0",
                  supportedContractVersions: [CONTRACT_VERSION],
                },
              },
            },
          },
        },
      },
      TooMany: {
        description:
          "Per-key rate limit exceeded (fixed one-minute windows, default 120 requests/minute, configured per credential). Retry after the current minute window closes.",
        content: {
          "application/json": {
            schema: errorSchema,
            examples: { limited: { value: { error: "Rate limit exceeded" } } },
          },
        },
      },
      BadCursor: {
        description:
          "Cursor malformed, signature invalid, bound to a different query, or bound to a different organization scope. Do not retry the same cursor; restart the walk.",
        content: {
          "application/json": {
            schema: errorSchema,
            examples: {
              tampered: { value: { error: "Cursor signature invalid" } },
              otherQuery: { value: { error: "Cursor does not belong to this query" } },
              otherOrg: {
                value: { error: "Cursor does not belong to this organization scope" },
              },
            },
          },
        },
      },
      MethodNotAllowed: {
        description: "Read-only boundary. Any non-GET on a catalog route.",
        content: {
          "application/json": {
            schema: errorSchema,
            examples: {
              write: { value: { error: "This API is read-only; only GET is accepted" } },
            },
          },
        },
      },
      NotFound: {
        description:
          "Record does not exist, or it is inactive and the credential does not carry inactive visibility.",
        content: { "application/json": { schema: errorSchema } },
      },
    },
    schemas: {
      Error: errorSchema,
      TokenResponse: {
        type: "object",
        required: [
          "contractVersion",
          "token",
          "tokenType",
          "expiresAt",
          "expiresInSeconds",
          "organizationId",
          "capabilities",
        ],
        properties: {
          contractVersion: { type: "string", const: CONTRACT_VERSION },
          token: {
            type: "string",
            description:
              "Short-lived bearer token, prefix `fgnt_`. Hold in memory only; never persist it in storage, cookies or logs.",
          },
          tokenType: { type: "string", const: "Bearer" },
          expiresAt: { type: "string", format: "date-time" },
          expiresInSeconds: { type: "integer", const: 900 },
          organizationId: {
            type: "string",
            format: "uuid",
            description: "Inherited from the durable key; cannot be requested or widened.",
          },
          capabilities: { type: "array", items: { $ref: "#/components/schemas/Capability" } },
        },
      },
      Capability: {
        type: "string",
        enum: ["catalog:read", "activities:read", "relationships:read"],
        description: [
          "`catalog:read` — required by /sources, /challenges and /challenges/{challengeId}.",
          "`activities:read` — required by /activities and /activities/{activityId}.",
          "`relationships:read` — required by /work-order-relationships.",
          "Inactive visibility is NOT a capability: it is a per-credential flag reported as `includesInactiveRecords` on /capabilities and on /challenges pages.",
        ].join(" "),
      },
      CapabilitiesResponse: {
        type: "object",
        required: [
          "contractVersion",
          "authenticated",
          "credentialType",
          "tenantId",
          "capabilities",
          "includesInactiveRecords",
          "revision",
          "pagination",
        ],
        properties: {
          contractVersion: { type: "string", const: CONTRACT_VERSION },
          authenticated: { type: "boolean", const: true },
          credentialType: { type: "string", enum: ["durable_key", "short_lived_token"] },
          tenantId: {
            type: "string",
            format: "uuid",
            description: "The organization this credential is scoped to. Authoritative.",
          },
          tenantLabel: { type: ["string", "null"] },
          tenantSlug: { type: ["string", "null"] },
          capabilities: { type: "array", items: { $ref: "#/components/schemas/Capability" } },
          includesInactiveRecords: {
            type: "boolean",
            description:
              "When true, inactive records are returned and flagged (`isActive: false` / `status`), so a hidden record can never be mistaken for a missing one. When false, inactive records are omitted everywhere including counts.",
          },
          catalogScope: { type: "string", description: "Human-readable statement of global vs organization visibility." },
          revision: { type: "integer" },
          pagination: {
            type: "object",
            properties: {
              style: { type: "string", const: "cursor" },
              defaultLimit: { type: "integer", const: 50 },
              maxLimit: { type: "integer", const: 200 },
            },
          },
        },
      },
      Source: {
        type: "object",
        required: ["sourceId", "label", "isActive", "scope", "sourceVersion", "challengeCount"],
        properties: {
          sourceId: { type: "string", format: "uuid" },
          label: { type: "string", description: "Game name." },
          slug: { type: ["string", "null"] },
          isActive: { type: "boolean" },
          scope: { type: "string", enum: ["global", "organization"] },
          sourceVersion: {
            type: "integer",
            description: "Per-source revision so a single game can be refreshed on its own.",
          },
          challengeCount: {
            type: "integer",
            description:
              "Counted under the same visibility rules as the credential's reads, so a count never describes rows you cannot read.",
          },
        },
      },
      Task: {
        type: "object",
        required: ["taskId", "title", "order"],
        properties: {
          taskId: { type: "string", format: "uuid", description: "Stable server-issued id." },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          order: { type: "integer", description: "Ascending display order within the challenge." },
          verificationType: { type: ["string", "null"] },
          taskVersion: {
            type: "string",
            format: "date-time",
            description: "Version marker for the task row.",
          },
        },
      },
      Challenge: {
        type: "object",
        required: ["challengeId", "name", "isActive", "sourceId", "scope", "taskIds", "tasks"],
        properties: {
          challengeId: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          isActive: { type: "boolean" },
          kind: { type: ["string", "null"], description: "Track, falling back to challenge type." },
          difficulty: { type: ["string", "null"] },
          points: { type: ["integer", "null"] },
          xp: { type: ["integer", "null"] },
          estimatedMinutes: { type: ["integer", "null"] },
          requiresEvidence: { type: ["boolean", "null"] },
          contentClassification: {
            type: ["string", "null"],
            description: "e.g. simulation, entertainment_only.",
          },
          canonicalActivityId: {
            type: ["string", "null"],
            format: "uuid",
            description: "Canonical simulation activity this challenge is a variant of, when mapped.",
          },
          academyRelationship: {
            type: ["object", "null"],
            properties: {
              label: { type: ["string", "null"] },
              url: { type: ["string", "null"] },
            },
          },
          sourceId: { type: "string", format: "uuid" },
          scope: { type: "string", enum: ["global", "organization"] },
          startDate: { type: ["string", "null"], format: "date-time" },
          endDate: { type: ["string", "null"], format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
          taskIds: { type: "array", items: { type: "string", format: "uuid" } },
          tasks: {
            type: "array",
            description: "Fully expanded task objects in ascending order. Same set as taskIds.",
            items: { $ref: "#/components/schemas/Task" },
          },
        },
      },
      ActivityMapping: {
        type: "object",
        properties: {
          challengeId: { type: "string", format: "uuid" },
          taskId: { type: ["string", "null"], format: "uuid" },
          isPrimary: { type: ["boolean", "null"] },
          mappingStatus: { type: ["string", "null"] },
        },
      },
      Activity: {
        type: "object",
        required: ["activityId", "name", "slug", "status", "scope", "variantChallengeIds"],
        properties: {
          activityId: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          actionDescription: { type: ["string", "null"] },
          sourceId: { type: ["string", "null"], format: "uuid" },
          gameVersion: { type: ["string", "null"] },
          category: { type: ["string", "null"] },
          industryDomain: { type: ["string", "null"] },
          status: { type: "string", description: "e.g. active, retired." },
          provenance: { type: ["string", "null"] },
          schemaVersion: { type: ["string", "integer", "null"] },
          scope: { type: "string", enum: ["global", "organization"] },
          updatedAt: { type: ["string", "null"], format: "date-time" },
          variantChallengeIds: {
            type: "array",
            items: { type: "string", format: "uuid" },
            description: "Distinct challenges that are variants of this canonical activity.",
          },
          mappings: { type: "array", items: { $ref: "#/components/schemas/ActivityMapping" } },
        },
      },
      WorkOrderRelationship: {
        type: "object",
        required: ["activityId", "challengeId", "maturity"],
        properties: {
          activityId: { type: "string", format: "uuid" },
          challengeId: { type: "string", format: "uuid" },
          taskId: { type: ["string", "null"], format: "uuid" },
          isPrimary: { type: ["boolean", "null"] },
          mappingStatus: { type: ["string", "null"] },
          workOrderId: {
            type: ["string", "null"],
            description: "Always null on this surface: FGN Academy owns work-order identity.",
          },
          title: { type: ["string", "null"] },
          maturity: {
            type: "string",
            enum: ["confirmed", "provisional"],
            description: "confirmed when mappingStatus is matched, otherwise provisional.",
          },
          externalReference: { type: ["string", "null"], format: "uri" },
        },
      },
      SourcesPage: {
        type: "object",
        required: ["contractVersion", "revision", "items", "nextCursor"],
        properties: {
          ...pageEnvelope,
          items: { type: "array", items: { $ref: "#/components/schemas/Source" } },
        },
      },
      ChallengesPage: {
        type: "object",
        required: ["contractVersion", "revision", "items", "nextCursor", "includesInactiveRecords"],
        properties: {
          ...pageEnvelope,
          sourceVersion: {
            type: ["integer", "null"],
            description: "Per-source revision when sourceId was supplied, otherwise null.",
          },
          includesInactiveRecords: { type: "boolean" },
          items: { type: "array", items: { $ref: "#/components/schemas/Challenge" } },
        },
      },
      ChallengeItem: {
        type: "object",
        required: ["contractVersion", "revision", "item"],
        properties: {
          contractVersion: { type: "string", const: CONTRACT_VERSION },
          revision: { type: "integer" },
          sourceVersion: { type: "integer" },
          item: { $ref: "#/components/schemas/Challenge" },
        },
      },
      ActivitiesPage: {
        type: "object",
        required: ["contractVersion", "revision", "items", "nextCursor"],
        properties: {
          ...pageEnvelope,
          items: { type: "array", items: { $ref: "#/components/schemas/Activity" } },
        },
      },
      ActivityItem: {
        type: "object",
        required: ["contractVersion", "revision", "item"],
        properties: {
          contractVersion: { type: "string", const: CONTRACT_VERSION },
          revision: { type: "integer" },
          item: { $ref: "#/components/schemas/Activity" },
        },
      },
      RelationshipsPage: {
        type: "object",
        required: ["contractVersion", "revision", "authority", "items", "nextCursor"],
        properties: {
          ...pageEnvelope,
          authority: {
            type: "string",
            description:
              "FGN.GG publishes the relationships it holds. FGN Academy remains authoritative for its own work-order definitions and maturity.",
          },
          items: { type: "array", items: { $ref: "#/components/schemas/WorkOrderRelationship" } },
        },
      },
    },
  },
  paths: {
    "/openapi.json": {
      get: {
        tags: ["discovery"],
        summary: "This contract, machine readable.",
        description:
          "Unauthenticated and exempt from the X-Studio-Contract header. OPTIONS preflight on every route is likewise exempt from both. Every other route requires both.",
        security: [],
        parameters: [],
        responses: { "200": { description: "Contract document" }, "405": { $ref: "#/components/responses/MethodNotAllowed" } },
      },
    },
    "/token": {
      post: {
        tags: ["auth"],
        summary: "Exchange a durable partner key for a short-lived organization-scoped token.",
        description: [
          "Send the durable key in `Authorization: Bearer fgnk_…` — there is no key query parameter, no `X-Api-Key` header and no credential field in the body.",
          "The request body is not read: send none, or an empty JSON object. No body field can change the organization, capabilities, lifetime or inactive visibility of the issued token; all four are inherited from the key.",
          "Server-only exchange (primary control): any request carrying an `Origin` header is rejected with 403 `Token exchange is server-only; requests carrying an Origin header are rejected. Exchange durable keys from your server or proxy.` The rejection happens before the credential is examined, so a browser-issued exchange fails even with a valid durable key, and even if its origin is on the CORS allowlist. Server-to-server calls send no `Origin` header and are unaffected.",
          "Two further, independent controls: CORS is an exact-match approved-origin allowlist, so an unlisted origin receives no `Access-Control-Allow-Origin` header; and a `fgnt_` token presented here returns 401 `This route requires a durable partner key`, so a browser cannot re-mint or extend its own token. Studio's browser calls only the operator proxy, which holds the key and returns the token.",
          "Tokens live 15 minutes (900 seconds) and are stored hashed. Revoking the key invalidates every token already minted from it immediately.",
        ].join("\n\n"),
        parameters: [{ $ref: "#/components/parameters/contract" }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                description: "No fields are accepted or read.",
              },
              example: {},
            },
          },
        },
        responses: {
          "200": {
            description: "Token issued.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenResponse" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  token: "fgnt_0000000000000000000000000000000000000000000000000000000000000000",
                  tokenType: "Bearer",
                  expiresAt: "2026-09-23T15:45:00.000Z",
                  expiresInSeconds: 900,
                  organizationId: "00000000-0000-0000-0000-000000000000",
                  capabilities: ["catalog:read", "activities:read", "relationships:read"],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/capabilities": {
      get: {
        tags: ["catalog"],
        summary: "Organization scope, permissions, inactive-record policy and current revision.",
        description:
          "Works with either credential type. Requires no capability, so it is the correct probe for a newly issued credential.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          { $ref: "#/components/parameters/organizationId" },
        ],
        responses: {
          "200": {
            description: "Capability document.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CapabilitiesResponse" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  authenticated: true,
                  credentialType: "short_lived_token",
                  tenantId: "00000000-0000-0000-0000-000000000000",
                  tenantLabel: "Example Organization",
                  tenantSlug: "example-org",
                  capabilities: ["catalog:read", "activities:read", "relationships:read"],
                  includesInactiveRecords: true,
                  catalogScope:
                    "Games, challenges, tasks and canonical simulation activities are platform-global records, visible to every authorized organization and flagged scope=global. Organization-owned records are flagged scope=organization and only the credential's organization can see them.",
                  revision: 128,
                  pagination: { style: "cursor", defaultLimit: 50, maxLimit: 200 },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/sources": {
      get: {
        tags: ["catalog"],
        summary: "Catalog sources (games) with per-source revision and a scoped challenge count.",
        description: "Requires capability `catalog:read`.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          { $ref: "#/components/parameters/cursor" },
          { $ref: "#/components/parameters/limit" },
          { $ref: "#/components/parameters/organizationId" },
        ],
        responses: {
          "200": {
            description: "Page of sources.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SourcesPage" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  revision: 128,
                  revisionChanged: false,
                  items: [
                    {
                      sourceId: "11111111-1111-1111-1111-111111111111",
                      label: "American Truck Simulator",
                      slug: "american-truck-simulator",
                      isActive: true,
                      scope: "global",
                      sourceVersion: 42,
                      challengeCount: 18,
                    },
                  ],
                  nextCursor: "eyJ0IjoiMjAyNi0wMS0wMSJ9.9f1c…",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadCursor" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/challenges": {
      get: {
        tags: ["catalog"],
        summary: "Challenges with descriptions and fully expanded ordered task objects.",
        description:
          "Requires capability `catalog:read`. Inactive challenges appear flagged `isActive: false` only when the credential carries inactive visibility; the page repeats that policy as `includesInactiveRecords`.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          { $ref: "#/components/parameters/sourceId" },
          { $ref: "#/components/parameters/cursor" },
          { $ref: "#/components/parameters/limit" },
          { $ref: "#/components/parameters/organizationId" },
        ],
        responses: {
          "200": {
            description: "Page of challenges.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChallengesPage" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  revision: 128,
                  sourceVersion: 42,
                  revisionChanged: false,
                  includesInactiveRecords: true,
                  items: [
                    {
                      challengeId: "22222222-2222-2222-2222-222222222222",
                      name: "Trailer Positioning and Dock Approach",
                      description: "Reverse a 53-foot trailer to a loading dock…",
                      isActive: true,
                      kind: "standard",
                      difficulty: "intermediate",
                      points: 150,
                      xp: 300,
                      estimatedMinutes: 30,
                      requiresEvidence: true,
                      contentClassification: "simulation",
                      canonicalActivityId: "33333333-3333-3333-3333-333333333333",
                      academyRelationship: {
                        label: "Continue at FGN Academy",
                        url: "https://fgn.academy/example",
                      },
                      sourceId: "11111111-1111-1111-1111-111111111111",
                      scope: "global",
                      startDate: null,
                      endDate: null,
                      updatedAt: "2026-09-20T18:02:11.000Z",
                      taskIds: ["44444444-4444-4444-4444-444444444444"],
                      tasks: [
                        {
                          taskId: "44444444-4444-4444-4444-444444444444",
                          title: "Set up the approach angle",
                          description: "Position the tractor so the trailer tracks into the dock lane.",
                          order: 1,
                          verificationType: "screenshot",
                          taskVersion: "2026-09-18T12:00:00.000Z",
                        },
                      ],
                    },
                  ],
                  nextCursor: null,
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadCursor" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/challenges/{challengeId}": {
      get: {
        tags: ["catalog"],
        summary: "One challenge with its ordered tasks.",
        description: "Requires capability `catalog:read`.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          {
            name: "challengeId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Challenge.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ChallengeItem" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/activities": {
      get: {
        tags: ["catalog"],
        summary: "Canonical simulation activities.",
        description:
          "Requires capability `activities:read`. Without inactive visibility, only activities with status `active` are returned.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          { $ref: "#/components/parameters/cursor" },
          { $ref: "#/components/parameters/limit" },
          { $ref: "#/components/parameters/organizationId" },
        ],
        responses: {
          "200": {
            description: "Page of activities.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ActivitiesPage" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  revision: 128,
                  revisionChanged: false,
                  items: [
                    {
                      activityId: "33333333-3333-3333-3333-333333333333",
                      name: "Trailer Positioning and Dock Approach",
                      slug: "trailer-positioning-and-dock-approach",
                      actionDescription: "Back a trailer to a dock under simulated conditions.",
                      sourceId: "11111111-1111-1111-1111-111111111111",
                      gameVersion: null,
                      category: "vehicle_operation",
                      industryDomain: "transportation",
                      status: "active",
                      provenance: "platform",
                      schemaVersion: 1,
                      scope: "global",
                      updatedAt: "2026-09-22T09:14:00.000Z",
                      variantChallengeIds: ["22222222-2222-2222-2222-222222222222"],
                      mappings: [
                        {
                          challengeId: "22222222-2222-2222-2222-222222222222",
                          taskId: null,
                          isPrimary: true,
                          mappingStatus: "matched",
                        },
                      ],
                    },
                  ],
                  nextCursor: null,
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadCursor" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/activities/{activityId}": {
      get: {
        tags: ["catalog"],
        summary: "Canonical simulation activity lookup by id.",
        description: "Requires capability `activities:read`.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          {
            name: "activityId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Activity.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ActivityItem" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
    "/work-order-relationships": {
      get: {
        tags: ["catalog"],
        summary: "Relationships FGN.GG holds between canonical activities and downstream work.",
        description:
          "Requires capability `relationships:read`. FGN Academy remains authoritative for its own work-order definitions and maturity; this route reports only what FGN.GG holds and says so in the payload's `authority` field.",
        parameters: [
          { $ref: "#/components/parameters/contract" },
          {
            name: "activityIds",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Comma-separated activity ids. Omit for all relationships in scope.",
          },
          { $ref: "#/components/parameters/cursor" },
          { $ref: "#/components/parameters/limit" },
          { $ref: "#/components/parameters/organizationId" },
        ],
        responses: {
          "200": {
            description: "Page of relationships.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RelationshipsPage" },
                example: {
                  contractVersion: CONTRACT_VERSION,
                  revision: 128,
                  revisionChanged: false,
                  authority:
                    "FGN.GG publishes the relationships it holds. FGN Academy remains authoritative for its own work-order definitions and maturity.",
                  items: [
                    {
                      activityId: "33333333-3333-3333-3333-333333333333",
                      challengeId: "22222222-2222-2222-2222-222222222222",
                      taskId: null,
                      isPrimary: true,
                      mappingStatus: "matched",
                      workOrderId: null,
                      title: "Continue at FGN Academy",
                      maturity: "confirmed",
                      externalReference: "https://fgn.academy/example",
                    },
                  ],
                  nextCursor: null,
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadCursor" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "405": { $ref: "#/components/responses/MethodNotAllowed" },
          "409": { $ref: "#/components/responses/Conflict" },
          "429": { $ref: "#/components/responses/TooMany" },
        },
      },
    },
  },
};
