

# Dynamic Notebook Connections for AI Coach

## Overview

Update the `ai-coach` edge function to dynamically query all active notebook connections from the `admin_notebook_connections` table instead of using a hardcoded notebook ID. When notebook results are empty or irrelevant, the AI model's general knowledge will serve as the fallback (this already happens naturally since the system prompt instructs it to "use your general esports expertise" when no knowledge base content matches).

## Changes

### 1. Update `supabase/functions/ai-coach/index.ts`

**What changes:**
- Import the Supabase client (service role) to query the `admin_notebook_connections` table
- Replace the hardcoded notebook ID (`notebook:f8y4zed28cky7uibdoia`) with a dynamic lookup
- Query all rows where `is_active = true` from `admin_notebook_connections`
- For each active connection, search using the connection's `api_url` and `notebook_id`
- Aggregate results from all active notebooks into the context
- If zero passages are returned from all notebooks, the system prompt already instructs the model to fall back to general expertise -- no additional logic needed

**Key logic:**

```text
1. Create Supabase service-role client
2. SELECT api_url, notebook_id, name FROM admin_notebook_connections WHERE is_active = true
3. For each connection:
   a. POST to {api_url}/api/search with { query, notebook_id }
   b. Collect up to 3 passages per notebook (cap total at ~8 passages across all)
   c. Label passages with the connection name for attribution
   d. Use shared OPEN_NOTEBOOK_PASSWORD secret for auth (same VPS host)
4. If all searches fail or return nothing, notebookContext stays empty
5. System prompt already handles the fallback: "If no knowledge base content matches, use your general esports expertise"
```

**Error handling:**
- Each notebook search is wrapped in its own try/catch so one failing connection does not block others
- Health status is not updated during coach queries (that remains an admin-panel action)

### 2. No database or frontend changes needed

- The `admin_notebook_connections` table and admin UI already exist
- The system prompt already contains fallback instructions
- The shared credential architecture (single `OPEN_NOTEBOOK_PASSWORD` secret) is already in place

## Technical Details

The edge function will use the service role key to bypass RLS and read the connections table:

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const { data: connections } = await supabase
  .from("admin_notebook_connections")
  .select("api_url, notebook_id, name")
  .eq("is_active", true);
```

Passages will be capped per-connection (3 each) and globally (8 total) to keep the context window manageable. Each passage will be prefixed with `[Source: {connection.name}]` for traceability.

