

## Problem

The screenshot shows Discord's error: **"You need a verified e-mail or phone number in order to perform this action."**

This is a **Discord-side requirement**, not a bug in your code. Discord requires users to have a verified email or phone on their Discord account before they can authorize third-party OAuth apps. Users with brand-new or unverified Discord accounts will hit this wall.

The `guilds.members.read` scope is also a higher-privilege scope that may trigger stricter verification requirements from Discord.

## Plan

### 1. Reduce OAuth scope to minimum required

The current scope is `identify guilds.members.read`. The `guilds.members.read` scope is only needed if you're checking server membership/nicknames. Since the code only uses Discord `id`, `username`, and `avatar` from the `/users/@me` endpoint, the `identify` scope alone is sufficient. Removing the extra scope reduces the chance Discord demands additional verification.

**File:** `src/pages/LinkDiscord.tsx`
- Change scope from `"identify guilds.members.read"` to `"identify"`

### 2. Add user-facing guidance on the Link Discord page

Show a helper note explaining that Discord requires a verified email on their account. This prevents confusion when users hit this error.

**File:** `src/pages/LinkDiscord.tsx`
- Add a small info callout below the link button: *"Discord requires a verified email address on your account. If you see an error, open Discord Settings > My Account and verify your email first."*

### 3. Handle the error gracefully in the callback

If a user lands back on `/link-discord` without a `code` parameter but with an `error` query param (Discord redirects with `error=...` on failure), show a helpful toast instead of silently doing nothing.

**File:** `src/pages/LinkDiscord.tsx`
- Check for `searchParams.get("error")` and display a descriptive toast with guidance

### Files to change

| File | Change |
|------|--------|
| `src/pages/LinkDiscord.tsx` | Reduce scope to `"identify"`, add verification guidance text, handle OAuth error redirects |

