

# Connect to Open Notebook on Hostinger VPS

## Assessment

The uploaded file is the **Hostinger infrastructure API** (for managing VPS servers, billing, etc.) -- it is **not needed** for connecting to the Open Notebook application. What we need instead is to call the **Open Notebook REST API** (FastAPI on port 5055) directly from a backend function.

## Open Notebook API Summary

Open Notebook (lfnovo/open-notebook) exposes a FastAPI REST API with these key endpoints relevant to the AI Coach:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notebooks` | GET | List all notebooks |
| `/api/notebooks/{id}` | GET | Get a specific notebook |
| `/api/sources?notebook_id=X` | GET | List sources in a notebook |
| `/api/sources/{id}` | GET | Get source content/details |
| `/api/notes?notebook_id=X` | GET | List notes in a notebook |
| `/api/search` | POST | Full-text or vector search across content |
| `/api/ask` | POST | Ask a question (search + AI-synthesized answer, SSE stream) |
| `/health` | GET | Health check |

**Authentication**: Bearer token via `Authorization: Bearer <password>` header (configured via `OPEN_NOTEBOOK_PASSWORD` env var on the VPS).

## What We Need From You

To connect, we need **3 pieces of information** stored as secrets:

1. **OPEN_NOTEBOOK_URL** -- The public URL of your Open Notebook API (e.g., `https://notebook.yourdomain.com` or `http://123.45.67.89:5055`)
2. **OPEN_NOTEBOOK_PASSWORD** -- The password/token configured on the Open Notebook container (the `OPEN_NOTEBOOK_PASSWORD` env var value)
3. **OPEN_NOTEBOOK_ID** -- The specific Notebook ID to query (you can find this in the Open Notebook UI or via `GET /api/notebooks`)

## Implementation Plan

### Step 1: Database Table for Notebook Connections

Create an `admin_notebook_connections` table to let admins manage multiple Open Notebook connections (e.g., one per game or category).

```
admin_notebook_connections
- id (uuid, PK)
- name (text) -- display name, e.g., "Valorant Guides"
- api_url (text) -- base URL of the Open Notebook instance
- notebook_id (text) -- the notebook:{id} to query
- is_active (boolean, default true)
- last_health_check (timestamptz)
- last_health_status (text) -- "healthy" or "error"
- created_at / updated_at
```

The API password will be stored as a backend secret (not in the database) since all connections share the same VPS.

### Step 2: Admin Page -- Notebook Connections

New admin page at `/admin/notebooks` with:

- List of configured notebook connections with health status
- "Add Connection" dialog: name, API URL, notebook ID
- "Test Connection" button that calls the health endpoint
- Enable/disable toggle per connection
- Add a "Notebooks" link to the admin sidebar (using BookOpen icon)

### Step 3: Backend Function -- `notebook-proxy`

A new edge function that acts as the proxy between the app and Open Notebook:

- **`GET /notebook-proxy?action=health`** -- Tests connectivity
- **`GET /notebook-proxy?action=notebooks`** -- Lists available notebooks on the VPS
- **`POST /notebook-proxy` with `{action: "search", query, notebook_id}`** -- Searches content
- **`POST /notebook-proxy` with `{action: "ask", question, notebook_id}`** -- Asks a question via Open Notebook's `/ask` endpoint (streams SSE back)

This function reads `OPEN_NOTEBOOK_URL` and `OPEN_NOTEBOOK_PASSWORD` from secrets.

### Step 4: Integrate with AI Coach

Update the planned `ai-coach` edge function to:
1. Fetch local game guide content from the `games` table
2. Also call `notebook-proxy` to search/retrieve relevant content from Open Notebook
3. Combine both sources as context for the AI coaching response

### Step 5: Store Secrets

Two secrets need to be configured:
- `OPEN_NOTEBOOK_URL` -- Your VPS endpoint (e.g., `https://notebook.yourdomain.com:5055`)
- `OPEN_NOTEBOOK_PASSWORD` -- The bearer token for API access

## Architecture

```text
Admin Panel                    Edge Functions                    Hostinger VPS
+-----------------------+      +-------------------+            +------------------+
| /admin/notebooks      | ---> | notebook-proxy    | ---------> | Open Notebook    |
| - Add/edit/test       |      | (reads secrets)   |  REST API  | FastAPI :5055    |
| - Health monitoring   |      +-------------------+            | - /notebooks     |
+-----------------------+             |                         | - /sources       |
                                      v                         | - /search        |
+-----------------------+      +-------------------+            | - /ask           |
| /coach (AI Coach)     | ---> | ai-coach          | ---------> +------------------+
| - Chat UI             |      | (merges context)  |
| - Game filter         |      +-------------------+
+-----------------------+             |
                                      v
                               +--------------+
                               | games table  |
                               | (local guides)|
                               +--------------+
```

## Technical Notes

- The Hostinger API you uploaded is for infrastructure management only -- we do not need it for this integration
- Open Notebook uses SurrealDB internally and notebook IDs are in the format `notebook:xxxxx`
- The `/ask` endpoint returns SSE streams, which aligns with our AI Coach streaming design
- If your VPS uses a reverse proxy (nginx/Caddy), ensure port 5055 is proxied or exposed
- CORS is enabled by default in Open Notebook development mode

