

## Plan: Game Server Directory with Optional Live Status Integration

### Overview
Build a server directory that admins can populate with gaming server connection details. Players see a card-based UI to browse and join servers. Optionally, admins can connect a Pterodactyl Panel API for live status (online/offline, player count).

### Database

**New table: `game_servers`**
```sql
CREATE TABLE public.game_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  game text NOT NULL,
  ip_address text NOT NULL,
  port integer,
  description text,
  image_url text,
  max_players integer,
  connection_instructions text,
  panel_type text,           -- 'pterodactyl' or NULL
  panel_url text,
  panel_server_id text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_servers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active servers
CREATE POLICY "Authenticated can view active servers"
  ON public.game_servers FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins full CRUD
CREATE POLICY "Admins can manage game servers"
  ON public.game_servers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### Edge Function

**`game-server-status/index.ts`** — Proxies a Pterodactyl Client API call for a given server ID. Looks up the server's `panel_url` and `panel_server_id` from DB, calls `GET {panel_url}/api/client/servers/{panel_server_id}/resources` using a stored API key, returns `{ is_online, current_players, max_players }`. Returns `{ is_online: null }` if no panel configured. Admin-authenticated.

The Pterodactyl API key will be stored as a platform secret (`PTERODACTYL_API_KEY`) via the secrets tool.

### Admin UI

**`src/pages/admin/AdminGameServers.tsx`**
- Table listing all servers (active and inactive) with name, game, IP:port, status, actions
- Add/Edit dialog with fields: name, game (text input or dropdown from existing games table), IP address, port, description, image URL, max players, connection instructions, panel type toggle, panel URL, panel server ID
- Delete with ConfirmDialog
- "Check Status" button per server (calls edge function, shows result inline)
- Toggle active/inactive

### Player UI

**`src/pages/GameServers.tsx`**
- Card grid of active servers
- Each card: server name, game badge, IP:port with copy-to-clipboard button, player count badge (if Pterodactyl connected), description
- Expandable "How to Join" section using Collapsible component
- Status dot: green (online), red (offline), grey (no panel)
- Auto-poll status every 60s for servers with panel configured

### Hook

**`src/hooks/useGameServers.ts`**
- `useGameServers()` — fetches active servers (player view)
- `useAdminGameServers()` — fetches all servers (admin view)
- `useCreateServer()`, `useUpdateServer()`, `useDeleteServer()` mutations
- `useServerStatus(serverId)` — calls the edge function

### Routing & Navigation

- Add `{ to: "/admin/game-servers", label: "Game Servers", icon: Server }` to `AdminSidebar.tsx`
- Add `{ to: "/servers", label: "Servers", icon: Server }` to `AppSidebar.tsx` main nav
- Add routes in `App.tsx`:
  - `/admin/game-servers` → `AdminRoute` wrapping `AdminGameServers`
  - `/servers` → authenticated route wrapping `GameServers`

### Guide Updates

- **Admin Guide**: Add "Game Servers" section covering how to add servers, optional Pterodactyl integration
- **Player Guide**: Add "Servers" section explaining how to find and join servers

### Files

| File | Action |
|------|--------|
| Migration SQL | Create `game_servers` table with RLS |
| `supabase/functions/game-server-status/index.ts` | New — Pterodactyl status proxy |
| `src/hooks/useGameServers.ts` | New — queries + mutations |
| `src/pages/admin/AdminGameServers.tsx` | New — admin CRUD |
| `src/pages/GameServers.tsx` | New — player server browser |
| `src/components/admin/AdminSidebar.tsx` | Add Game Servers link |
| `src/components/AppSidebar.tsx` | Add Servers link |
| `src/App.tsx` | Add routes |
| `src/pages/admin/AdminGuide.tsx` | Add Game Servers section |
| `src/pages/PlayerGuide.tsx` | Add Servers section |

