

## Store a New Ecosystem API Key as a Backend Secret

### Current State
- The `app_settings` table has **no** `ecosystem_api_key` row — one was never created.
- The updated `ecosystem-data-api` edge function already reads from `Deno.env.get("ECOSYSTEM_API_KEY")` and returns 500 if not configured.
- The `ECOSYSTEM_API_KEY` secret does not yet exist in the project secrets.

### Plan
1. **Generate a fresh API key** — a random 64-character hex string.
2. **Store it as a backend secret** using the `add_secret` tool with key name `ECOSYSTEM_API_KEY`.
3. **Share the key with you** so you can configure it in any ecosystem apps (Academy, Hub, BroadbandWorkforce) that call the data API.

No code changes needed — the edge function is already wired to read from this env var.

