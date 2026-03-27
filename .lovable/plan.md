

## Add Integration Health Check Endpoint

### What
A lightweight endpoint that fgn.academy (or any ecosystem app) can `GET` or `POST` to verify the play.fgn.gg connection is alive. Returns a simple status response without transferring any user/challenge data.

### Approach
Add a `health` action to the **existing `ecosystem-data-api` edge function** rather than creating a new function. This keeps the authentication pattern consistent — fgn.academy already authenticates via `X-Ecosystem-Key`.

### How it works
When `{ "action": "health" }` is sent, the function:
1. Validates the API key (existing auth flow)
2. Runs a trivial DB query (`SELECT 1`) to confirm database connectivity
3. Returns `{ status: "healthy", timestamp, services: { api: true, database: true } }`

No new secrets, no new config.toml entry, no migration needed.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/ecosystem-data-api/index.ts` | Add `health` action branch before other action handling (~10 lines) |

### Response Format
```json
{
  "status": "healthy",
  "timestamp": "2026-03-27T...",
  "services": {
    "api": true,
    "database": true,
    "academy_key_configured": true
  }
}
```

fgn.academy can poll this on a schedule (e.g. every 5 minutes) and surface a green/red status indicator.

