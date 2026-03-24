

## Fix: AI Coach "Unauthorized" Error

### Root Cause

The frontend (`useCoachChat.ts`, line 67) sends the **anon/publishable key** as the Authorization bearer token:

```typescript
Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
```

The edge function (`ai-coach/index.ts`, line 222) calls `supabase.auth.getClaims(token)` on this token, which fails because the anon key is not a user JWT. This causes the "Unauthorized" error for **all users** — admins and players alike.

### Fix

**`src/hooks/useCoachChat.ts`** — Replace the static anon key with the authenticated user's session access token:

1. Import `supabase` client
2. Before making the fetch call, retrieve the current session via `supabase.auth.getSession()`
3. Use the session's `access_token` as the Authorization bearer token
4. If no session exists, show an error toast and return early

```typescript
// Before fetch, get the user's JWT
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) {
  toast({ title: "Error", description: "Please sign in to use the AI Coach.", variant: "destructive" });
  setIsLoading(false);
  return;
}

// Use session token instead of anon key
Authorization: `Bearer ${session.access_token}`,
```

This is a single-file change (about 5 lines modified). No edge function changes needed — the backend auth logic is correct, it just needs to receive the right token.

### Technical Details

- The edge function creates a Supabase client with the Authorization header and validates the JWT via `getClaims` — this works correctly when given a real user JWT
- The `getClaims` call extracts `sub` (user ID) which is used to fetch the player's coaching profile for personalization
- After this fix, any authenticated user (player or admin) can use the AI Coach; unauthenticated users get a friendly sign-in prompt

