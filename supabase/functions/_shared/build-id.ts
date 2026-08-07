// Single build stamp shared by every function that carries the calendar-lane
// composer/tool code: `agent-run` (runner), `agent-mcp` (runner MCP endpoint)
// and `mcp` (OAuth MCP endpoint, which is bundled from src/lib/mcp/index.ts).
//
// Bump this string on every deploy that touches the runner, the MCP tool
// registry, the promo composer, the resolver or the title normalizer. Each
// endpoint exposes it on an unauthenticated GET so a probe can prove which
// code is actually running:
//
//   GET /functions/v1/agent-run   -> {"build_id": ...}
//   GET /functions/v1/agent-mcp   -> {"build_id": ...}
//   GET /functions/v1/mcp/.well-known/oauth-protected-resource
//        -> resource_documentation: https://fgn.gg/docs/mcp/build/<BUILD_ID>
//
// (The `mcp` function is SDK-generated and has no free route, so the stamp
// rides the one unauthenticated field the RFC 9728 metadata document lets us
// control.)
export const BUILD_ID = "2026-08-07T07:10Z-split-render";
