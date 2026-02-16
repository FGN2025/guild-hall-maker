

# AI Coach Feature

## Overview
Build an "AI Coach" chat page where authenticated users can ask esports questions. The coach retrieves relevant knowledge from your Open Notebook VPS (Rocket League guides, drills, etc.) and uses Lovable AI to generate coaching responses grounded in that content.

## Prerequisites (done first)

### 1. Fix the notebook connection data
- Delete the placeholder test row (`httpbin.org`) from `admin_notebook_connections`
- Insert the real connection: **FGN Esports Coach** with URL `http://72.62.168.228:5055`, notebook ID `notebook:f8y4zed28cky7uibdoia`, health status `healthy`
- Update the `OPEN_NOTEBOOK_PASSWORD` secret to `FGN2025!!`

## New Components

### 2. Backend function: `ai-coach`
A new edge function that:
1. Receives the user's question + conversation history
2. Calls the existing `notebook-proxy` logic internally to **search** the Open Notebook for relevant sources (using the `search` action against the configured notebook)
3. Builds a system prompt that includes the retrieved notebook context
4. Streams a response from Lovable AI (`google/gemini-3-flash-preview`) back to the client via SSE
5. Handles 429/402 rate-limit errors gracefully

```
User question --> ai-coach edge function
                    |
                    +--> Open Notebook search (VPS)
                    |       returns relevant passages
                    |
                    +--> Lovable AI Gateway (streaming)
                            system prompt includes notebook context
                    |
                    +--> SSE stream back to browser
```

### 3. Frontend page: `/coach`
- New page `src/pages/Coach.tsx` with a chat interface
- Conversation state managed in React (no database persistence needed initially)
- Token-by-token streaming rendering using the SSE pattern
- Markdown rendering for AI responses via `react-markdown`
- Input field at the bottom, messages scroll area above
- Styled to match the existing dark gaming theme

### 4. Sidebar navigation
- Add "AI Coach" link to `AppSidebar.tsx` in the main nav section (using the `BrainCircuit` or `Bot` icon from lucide-react)

### 5. Routing
- Add `/coach` route inside the authenticated `AppLayout` routes in `App.tsx`

## Technical Details

### Edge function: `supabase/functions/ai-coach/index.ts`
- Reads `OPEN_NOTEBOOK_URL`, `OPEN_NOTEBOOK_PASSWORD` from env for notebook search
- Reads `LOVABLE_API_KEY` from env for AI gateway
- POST body: `{ messages: [{role, content}[]] }`
- Step 1: Extract the latest user message, call Open Notebook search API (`/api/search`) with that query
- Step 2: Format retrieved passages into a system prompt section
- Step 3: Call `https://ai.gateway.lovable.dev/v1/chat/completions` with streaming enabled
- Step 4: Pipe the SSE stream back to the client
- Add to `supabase/config.toml` with `verify_jwt = false`

### Frontend streaming
- Uses `fetch()` with SSE line-by-line parsing (not `supabase.functions.invoke`)
- Updates the last assistant message content on each delta token
- Shows a loading indicator while waiting for first token
- Displays error toasts for 429/402 responses

### System prompt approach
The AI Coach system prompt will:
- Identify itself as the FGN Esports Coach
- Include retrieved notebook passages as context
- Instruct the model to answer based on the provided sources when relevant
- Fall back to general esports knowledge when no sources match

### Files to create
- `supabase/functions/ai-coach/index.ts` -- edge function
- `src/pages/Coach.tsx` -- chat page
- `src/hooks/useCoachChat.ts` -- streaming chat hook

### Files to modify
- `src/App.tsx` -- add `/coach` route
- `src/components/AppSidebar.tsx` -- add nav link
- `supabase/config.toml` -- add `[functions.ai-coach]` entry (auto-managed)

