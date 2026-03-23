

## Store ECOSYSTEM_API_KEY Secret

### What
Store the provided API key as a backend secret named `ECOSYSTEM_API_KEY`.

### Key Value
`cad47cf2d36d60d60510185475f8abd5e6ac20fe9929a31dfd7cbda516dbab64`

### Steps
1. Use the `add_secret` tool to store the key with name `ECOSYSTEM_API_KEY`
2. Confirm the edge function `ecosystem-data-api` can now read it via `Deno.env.get("ECOSYSTEM_API_KEY")`

No code changes needed — the edge function is already wired to read from this env var.

