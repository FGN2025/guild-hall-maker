import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, RefreshCw, Send, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Webhook {
  id: string;
  purpose: string;
  webhook_url: string;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface SendLog {
  id: string;
  purpose: string;
  status: string;
  http_status: number | null;
  error_message: string | null;
  created_at: string;
  template: string | null;
  data: any | null;
  tenant_id: string | null;
}

const PURPOSES = [
  "tournament_published",
  "tournament_completed",
  "tenant_event_published",
];

const DiscordWebhookManager = () => {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ purpose: "", webhook_url: "", tenant_id: "" });
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [h, l] = await Promise.all([
      (supabase as any).from("discord_channel_webhooks").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("discord_send_log").select("*").order("created_at", { ascending: false }).limit(25),
    ]);
    setHooks((h.data as Webhook[]) || []);
    setLogs((l.data as SendLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const add = async () => {
    if (!form.purpose || !form.webhook_url) {
      toast({ title: "Purpose and webhook URL required", variant: "destructive" });
      return;
    }
    if (!form.webhook_url.startsWith("https://discord.com/api/webhooks/") &&
        !form.webhook_url.startsWith("https://discordapp.com/api/webhooks/")) {
      toast({ title: "Must be a Discord webhook URL", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from("discord_channel_webhooks").insert({
      purpose: form.purpose,
      webhook_url: form.webhook_url,
      tenant_id: form.tenant_id || null,
      is_active: true,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Webhook added" });
      setForm({ purpose: "", webhook_url: "", tenant_id: "" });
      fetchAll();
    }
  };

  const toggle = async (h: Webhook) => {
    await (supabase as any).from("discord_channel_webhooks").update({ is_active: !h.is_active }).eq("id", h.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("discord_channel_webhooks").delete().eq("id", id);
    fetchAll();
  };

  const test = async (h: Webhook) => {
    setTesting(h.id);
    const { data, error } = await supabase.functions.invoke("discord-send-message", {
      body: {
        purpose: h.purpose,
        tenant_id: h.tenant_id,
        template: h.purpose,
        data: {
          name: "🧪 Test Message",
          description: "This is a test from the FGN admin panel.",
          game: "Test",
          format: "Test",
          start_date: new Date().toISOString(),
          url: "https://fgn.gg",
        },
      },
    });
    setTesting(null);
    if (error) {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Test sent", description: `Dispatched: ${(data as any)?.dispatched ?? 0}` });
      fetchAll();
    }
  };

  const retry = async (log: SendLog) => {
    const { data, error } = await supabase.functions.invoke("discord-send-message", {
      body: {
        purpose: log.purpose,
        tenant_id: log.tenant_id,
        template: log.template ?? undefined,
        data: log.data ?? undefined,
      },
    });
    if (error) toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Retried", description: `Dispatched: ${(data as any)?.dispatched ?? 0}` }); fetchAll(); }
  };

  const [registering, setRegistering] = useState(false);
  const registerCommands = async () => {
    setRegistering(true);
    const { data, error } = await supabase.functions.invoke("discord-register-commands", { body: {} });
    setRegistering(false);
    if (error || (data as any)?.ok === false) {
      toast({
        title: "Failed to register slash commands",
        description: error?.message || (data as any)?.body || "Unknown error",
        variant: "destructive",
      });
    } else {
      toast({ title: "Slash commands registered", description: "Discord now knows /leaderboard, /tournaments, /challenges." });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Discord Channel Webhooks</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={registerCommands} disabled={registering}>
            {registering ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Register slash commands
          </Button>
          <Button size="sm" variant="ghost" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a Discord channel webhook URL (Server Settings → Integrations → Webhooks) and pick what event publishes to it.
        Leave Tenant ID blank for the global FGN server.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Select value={form.purpose} onValueChange={(v) => setForm((p) => ({ ...p, purpose: v }))}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Purpose" /></SelectTrigger>
          <SelectContent>
            {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="https://discord.com/api/webhooks/..."
          value={form.webhook_url}
          onChange={(e) => setForm((p) => ({ ...p, webhook_url: e.target.value }))}
          className="bg-background sm:col-span-2 font-mono text-xs"
        />
        <Input
          placeholder="Tenant ID (optional)"
          value={form.tenant_id}
          onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}
          className="bg-background font-mono text-xs"
        />
        <Button onClick={add} disabled={adding} className="font-heading sm:col-span-4">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add Webhook
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : hooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Discord webhooks configured.</p>
      ) : (
        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="flex items-center gap-2 text-sm border border-border rounded p-2 bg-background">
              <Badge variant={h.is_active ? "default" : "secondary"}>{h.is_active ? "Active" : "Off"}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{h.purpose}</span>
              {h.tenant_id && <Badge variant="outline" className="text-[10px] font-mono">{h.tenant_id.slice(0, 8)}</Badge>}
              <span className="text-xs text-muted-foreground truncate flex-1">{h.webhook_url}</span>
              <Button size="icon" variant="ghost" onClick={() => test(h)} disabled={testing === h.id} title="Test">
                {testing === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => toggle(h)} title="Toggle"><RefreshCw className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(h.id)} title="Delete"><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="pt-2 border-t border-border space-y-1">
          <Label className="font-heading text-xs text-muted-foreground">Recent Sends</Label>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs py-1">
                <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-[10px]">
                  {log.status}{log.http_status ? ` ${log.http_status}` : ""}
                </Badge>
                <span className="font-mono text-muted-foreground">{log.purpose}</span>
                {log.error_message && <span className="text-destructive truncate max-w-[280px]">{log.error_message}</span>}
                <span className="flex-1" />
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                {log.status === "failed" && log.template && (
                  <Button size="icon" variant="ghost" onClick={() => retry(log)} title="Retry">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscordWebhookManager;
