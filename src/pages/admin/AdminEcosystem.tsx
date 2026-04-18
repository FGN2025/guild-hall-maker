import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Globe, Loader2, Plus, Trash2, RefreshCw, Copy,
  ArrowUpDown, Link as LinkIcon, Send, History, ExternalLink
} from "lucide-react";
import { useEcosystemAuth } from "@/hooks/useEcosystemAuth";
import DiscordRoleManager from "@/components/admin/DiscordRoleManager";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* ───────── types ───────── */
interface Webhook {
  id: string;
  target_app: string;
  event_type: string;
  webhook_url: string;
  secret_key: string;
  is_active: boolean;
  created_at: string;
}

interface SyncLog {
  id: string;
  target_app: string;
  data_type: string;
  records_synced: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface CareerMapping {
  id: string;
  game_id: string | null;
  challenge_id: string | null;
  target_app: string;
  external_path_id: string;
  external_module_id: string | null;
  credit_type: string;
  credit_value: number;
}

const EVENT_TYPES = [
  "challenge.completed",
  "evidence.approved",
  "tournament.published",
  "achievement.earned",
  "season.points_awarded",
];

const TARGET_APPS = ["academy", "manage", "hub", "broadband"];

/* ───────── component ───────── */
const ecosystemApps = [
  { target: "play" as const, label: "FGN Play", description: "Main gaming platform" },
  { target: "manage" as const, label: "FGN Manage", description: "Management portal" },
  { target: "hub" as const, label: "FGN Hub", description: "Community hub" },
];

const AdminEcosystem = () => {
  const { requestMagicLink, loading: loadingApp } = useEcosystemAuth();
  const [loadingKey] = useState(false);

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingWH, setLoadingWH] = useState(true);

  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [mappings, setMappings] = useState<CareerMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(true);

  const [games, setGames] = useState<{ id: string; name: string }[]>([]);
  const [challenges, setChallenges] = useState<{ id: string; name: string }[]>([]);

  // New webhook form
  const [newWH, setNewWH] = useState({ target_app: "", event_type: "", webhook_url: "" });
  const [addingWH, setAddingWH] = useState(false);

  // New mapping form
  const [newMap, setNewMap] = useState({ game_id: "", challenge_id: "", target_app: "", external_path_id: "", external_module_id: "", credit_type: "completion", credit_value: "1" });
  const [addingMap, setAddingMap] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchWebhooks();
    fetchLogs();
    fetchMappings();
    fetchGamesAndChallenges();
  };

  const fetchWebhooks = async () => {
    setLoadingWH(true);
    const { data } = await supabase.from("ecosystem_webhooks").select("*").order("created_at", { ascending: false });
    setWebhooks((data as Webhook[]) || []);
    setLoadingWH(false);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase.from("ecosystem_sync_log").select("*").order("created_at", { ascending: false }).limit(50);
    setLogs((data as SyncLog[]) || []);
    setLoadingLogs(false);
  };

  const fetchMappings = async () => {
    setLoadingMappings(true);
    const { data } = await supabase.from("career_path_mappings").select("*").order("created_at", { ascending: false });
    setMappings((data as CareerMapping[]) || []);
    setLoadingMappings(false);
  };

  const fetchGamesAndChallenges = async () => {
    const [gRes, cRes] = await Promise.all([
      supabase.from("games").select("id, name").eq("is_active", true).order("name"),
      supabase.from("challenges").select("id, name").eq("is_active", true).order("name"),
    ]);
    setGames(gRes.data || []);
    setChallenges(cRes.data || []);
  };




  /* Webhooks */
  const addWebhook = async () => {
    if (!newWH.target_app || !newWH.event_type || !newWH.webhook_url) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setAddingWH(true);
    const secret = crypto.randomUUID();
    const { error } = await supabase.from("ecosystem_webhooks").insert({
      target_app: newWH.target_app,
      event_type: newWH.event_type,
      webhook_url: newWH.webhook_url,
      secret_key: secret,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Webhook added", description: `HMAC secret: ${secret}` });
      setNewWH({ target_app: "", event_type: "", webhook_url: "" });
      fetchWebhooks();
    }
    setAddingWH(false);
  };

  const deleteWebhook = async (id: string) => {
    await supabase.from("ecosystem_webhooks").delete().eq("id", id);
    fetchWebhooks();
  };

  const toggleWebhook = async (wh: Webhook) => {
    await supabase.from("ecosystem_webhooks").update({ is_active: !wh.is_active }).eq("id", wh.id);
    fetchWebhooks();
  };

  const testWebhook = async (wh: Webhook) => {
    const { data, error } = await supabase.functions.invoke("ecosystem-webhook-dispatch", {
      body: { event_type: wh.event_type, payload: { test: true, timestamp: new Date().toISOString() } },
    });
    if (error) {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Test dispatched", description: `${data?.dispatched || 0} webhook(s) fired.` });
      fetchLogs();
    }
  };

  /* Mappings */
  const addMapping = async () => {
    if (!newMap.target_app || !newMap.external_path_id) {
      toast({ title: "Target app and path ID required", variant: "destructive" });
      return;
    }
    setAddingMap(true);
    const { error } = await supabase.from("career_path_mappings").insert({
      game_id: newMap.game_id || null,
      challenge_id: newMap.challenge_id || null,
      target_app: newMap.target_app,
      external_path_id: newMap.external_path_id,
      external_module_id: newMap.external_module_id || null,
      credit_type: newMap.credit_type,
      credit_value: parseFloat(newMap.credit_value) || 1,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mapping added" });
      setNewMap({ game_id: "", challenge_id: "", target_app: "", external_path_id: "", external_module_id: "", credit_type: "completion", credit_value: "1" });
      fetchMappings();
    }
    setAddingMap(false);
  };

  const deleteMapping = async (id: string) => {
    await supabase.from("career_path_mappings").delete().eq("id", id);
    fetchMappings();
  };

  const calendarFeedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecosystem-calendar-feed`;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold text-foreground">Ecosystem</h1>
      </div>

      {/* Ecosystem Apps */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">FGN Ecosystem Apps</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Launch other FGN ecosystem applications. You'll be automatically authenticated via a secure magic link.
        </p>
        <div className="flex flex-wrap gap-3">
          {ecosystemApps.map((app) => (
            <Button
              key={app.target}
              variant="outline"
              onClick={() => requestMagicLink(app.target)}
              disabled={loadingApp !== null}
              className="gap-2"
            >
              {loadingApp === app.target ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {app.label}
            </Button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Ecosystem API Key</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          External apps use this key in the <code className="bg-muted px-1 rounded">X-Ecosystem-Key</code> header to pull data.
        </p>
        <div className="flex items-center gap-2 p-3 rounded border border-border bg-muted/50">
          <Input value="••••••••••••••••••••••••" readOnly className="font-mono text-xs bg-background" />
          <Badge variant="secondary" className="whitespace-nowrap">Managed as backend secret</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          This key is securely stored as a backend secret (<code className="bg-muted px-1 rounded">ECOSYSTEM_API_KEY</code>). Contact a platform administrator to view or rotate it.
        </p>
      </div>

      {/* Calendar Feed */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Calendar Feed</Label>
        </div>
        <p className="text-xs text-muted-foreground">Public endpoint merging tournaments, tenant events, and challenge deadlines. No auth needed.</p>
        <div className="flex gap-2 flex-wrap">
          <Input value={`${calendarFeedUrl}?format=json`} readOnly className="font-mono text-xs bg-background flex-1 min-w-[200px]" />
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${calendarFeedUrl}?format=json`); toast({ title: "Copied" }); }}>
            <Copy className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${calendarFeedUrl}?format=ical`); toast({ title: "Copied" }); }}>
            <Copy className="h-4 w-4 mr-1" /> iCal
          </Button>
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <Label className="font-heading text-sm">Outbound Webhooks</Label>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchWebhooks}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground">Push real-time events to external apps. Each webhook receives HMAC-signed payloads.</p>

        {/* Add form */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Select value={newWH.target_app} onValueChange={(v) => setNewWH((p) => ({ ...p, target_app: v }))}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Target App" /></SelectTrigger>
            <SelectContent>
              {TARGET_APPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newWH.event_type} onValueChange={(v) => setNewWH((p) => ({ ...p, event_type: v }))}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Event Type" /></SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="https://..." value={newWH.webhook_url} onChange={(e) => setNewWH((p) => ({ ...p, webhook_url: e.target.value }))} className="bg-background" />
          <Button onClick={addWebhook} disabled={addingWH} className="font-heading">
            {addingWH ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
          </Button>
        </div>

        {loadingWH ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No webhooks configured.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center gap-2 text-sm border border-border rounded p-2 bg-background">
                <Badge variant={wh.is_active ? "default" : "secondary"}>{wh.is_active ? "Active" : "Off"}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{wh.event_type}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="font-heading text-xs">{wh.target_app}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{wh.webhook_url}</span>
                <Button size="icon" variant="ghost" onClick={() => testWebhook(wh)} title="Test"><Send className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" onClick={() => toggleWebhook(wh)} title="Toggle"><RefreshCw className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteWebhook(wh.id)} title="Delete"><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Career Path Mappings */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Career Path Mappings</Label>
        </div>
        <p className="text-xs text-muted-foreground">Map gaming challenges/games to trade career learning modules in external LMS platforms.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={newMap.game_id} onValueChange={(v) => setNewMap((p) => ({ ...p, game_id: v }))}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Game (optional)" /></SelectTrigger>
            <SelectContent>
              {games.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newMap.challenge_id} onValueChange={(v) => setNewMap((p) => ({ ...p, challenge_id: v }))}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Challenge (optional)" /></SelectTrigger>
            <SelectContent>
              {challenges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={newMap.target_app} onValueChange={(v) => setNewMap((p) => ({ ...p, target_app: v }))}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Target App" /></SelectTrigger>
            <SelectContent>
              {TARGET_APPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="e.g. cdl-class-a or path-001" value={newMap.external_path_id} onChange={(e) => setNewMap((p) => ({ ...p, external_path_id: e.target.value }))} className="bg-background font-mono text-xs" />
          <Input placeholder="e.g. module-safety-101 (optional)" value={newMap.external_module_id} onChange={(e) => setNewMap((p) => ({ ...p, external_module_id: e.target.value }))} className="bg-background font-mono text-xs" />
          <Select value={newMap.credit_type} onValueChange={(v) => setNewMap((p) => ({ ...p, credit_type: v }))}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completion">Completion</SelectItem>
              <SelectItem value="evidence">Evidence</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addMapping} disabled={addingMap} className="font-heading">
            {addingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add Mapping
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use the learning-path and module IDs from your external LMS. If none exist yet, create a shared naming convention (e.g. <code className="bg-muted px-1 rounded">path-001</code>) and use the same IDs in both systems.
        </p>

        {loadingMappings ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No career path mappings configured.</p>
        ) : (
          <div className="space-y-2">
            {mappings.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs border border-border rounded p-2 bg-background">
                <Badge variant="outline">{m.target_app}</Badge>
                {m.game_id && <span className="text-muted-foreground">Game: {games.find((g) => g.id === m.game_id)?.name || m.game_id.slice(0, 8)}</span>}
                {m.challenge_id && <span className="text-muted-foreground">Challenge: {challenges.find((c) => c.id === m.challenge_id)?.name || m.challenge_id.slice(0, 8)}</span>}
                <span className="font-mono text-primary">{m.external_path_id}</span>
                {m.external_module_id && <span className="font-mono text-muted-foreground">/ {m.external_module_id}</span>}
                <Badge variant="secondary">{m.credit_type} × {m.credit_value}</Badge>
                <span className="flex-1" />
                <Button size="icon" variant="ghost" onClick={() => deleteMapping(m.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Logs */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <Label className="font-heading text-sm">Sync Log</Label>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync activity yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs border-b border-border py-1.5">
                <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-[10px]">{log.status}</Badge>
                <span className="font-heading">{log.target_app}</span>
                <span className="text-muted-foreground">{log.data_type}</span>
                <span className="text-muted-foreground">{log.records_synced} rec</span>
                {log.error_message && <span className="text-destructive truncate max-w-[200px]">{log.error_message}</span>}
                <span className="flex-1" />
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discord Role Mappings */}
      <div className="glass-panel rounded-xl border border-border/50 p-6">
        <DiscordRoleManager />
      </div>
    </div>
  );
};

export default AdminEcosystem;
