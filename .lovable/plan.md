

## Generate and Store Ecosystem API Key

### Plan

1. **Generate a secure random 64-character hex key** using a script
2. **Display the key in chat** so you can copy it for use in external ecosystem apps
3. **Store it as a backend secret** named `ECOSYSTEM_API_KEY` using the secrets tool — I'll pre-fill the value so you just confirm

### Technical Detail

- Key format: 64-character hex string (32 bytes of randomness)
- The edge function `ecosystem-data-api` already reads from `Deno.env.get("ECOSYSTEM_API_KEY")` — no code changes needed
- You'll need to configure this same key in any external apps (Academy, Hub, BroadbandWorkforce) that call the ecosystem data API

