

## Fix Discord Linking Loop

### Root Cause

The backend logs confirm: **`Discord token exchange failed: {"error": "invalid_client"}`**

The `DISCORD_CLIENT_SECRET` stored in your backend secrets is either incorrect or stale. Discord rejects the token exchange, the function returns a 400 error, and the user is left on the `/link-discord` page in a loop.

### Secondary Issue: Redirect URI Mismatch

From your screenshot, Discord shows the redirect going to `https://play.fgn.gg/link-discord`. However, `window.location.origin` in the app produces a different origin depending on where the user is (preview URL vs published URL vs custom domain). The `redirect_uri` used in the authorization request **must exactly match** the one sent during the code exchange, or Discord rejects it too.

### Plan

#### Step 1: Update the DISCORD_CLIENT_SECRET

Re-copy the client secret from the Discord Developer Portal (Applications > FGN Play > OAuth2 > Client Secret) and store it as a fresh secret value.

#### Step 2: Fix redirect URI handling for custom domain

Update `LinkDiscord.tsx` to use the production custom domain (`https://play.fgn.gg`) as the redirect URI instead of `window.location.origin`, which varies between preview and production environments. This ensures the redirect URI is consistent between the authorization request and the code exchange.

#### Step 3: Register all redirect URIs in Discord Developer Portal (manual)

In the Discord Developer Portal under OAuth2 > Redirects, ensure these URLs are all registered:
- `https://play.fgn.gg/link-discord`
- `https://guild-hall-maker.lovable.app/link-discord`

---

### Technical Details

**Step 1** -- Use the secrets tool to update the `DISCORD_CLIENT_SECRET` value.

**Step 2** -- Modify `src/pages/LinkDiscord.tsx` line 19:
```typescript
// Before
const redirectUri = `${window.location.origin}/link-discord`;

// After — use production domain, falling back to current origin for local dev
const redirectUri = window.location.hostname.includes("localhost")
  ? `${window.location.origin}/link-discord`
  : "https://play.fgn.gg/link-discord";
```

**Step 3** -- Manual step in the Discord Developer Portal to add redirect URIs.

