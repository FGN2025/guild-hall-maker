import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Hash, Plus, Trash2, RefreshCw, Send, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Route {
  id: string;
  purpose: string;
  channel_id: string;
  guild_id: string | null;
  tenant_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const PURPOSES = [
  "tournament_published",
  "tournament_completed",
  "tenant_event_published",
  "challenge_published",
  "quest_published",
  "prize_redeemed",
  "achievement_earned",
];

const DiscordChannelRouteManager = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ purpose: "", channel_id: "", guild_id: "", tenant_id: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("discord_channel_routes")
      .select("*")
      .order("created_at", { ascending: false });
    setRoutes((data as Route[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const add = async () => {
    if (!form.purpose || !form.channel_id) {
      toast({ title: "Purpose and channel ID required", variant: "destructive" });
      return;
    }
    if (!/^\d{17,20}$/.test(form.channel_id.trim())) {
      toast({ title: "Channel ID must be a Discord snowflake (digits only)", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from("discord_channel_routes").insert({
      purpose: form.purpose,
      channel_id: form.channel_id.trim(),
      guild_id: form.guild_id.trim() || null,
      tenant_id: form.tenant_id.trim() || null,
      notes: form.notes.trim() || null,
      is_active: true,
    });
    setAdding(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Route added" });
      setForm({ purpose: "", channel_id: "", guild_id: "", tenant_id: "", notes: "" });
      fetchAll();
    }
  };

  const toggle = async (r: Route) => {
    await (supabase as any).from("discord_channel_routes").update({ is_active: !r.is_active }).eq("id", r.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("discord_channel_routes").delete().eq("id", id);
    fetchAll();
  };

  const test = async (r: Route) => {
    setTesting(r.id);
    const { data, error } = await supabase.functions.invoke("discord-send-message", {
      body: {
        purpose: r.purpose,
        tenant_id: r.tenant_id,
        template: r.purpose,
        data: {
          name: "🧪 Test Message",
          description: "Test from FGN admin (bot route).",
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
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Discord Bot Channel Routes</Label>
        </div>
        <Button size="sm" variant="ghost" onClick={fetchAll}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Use the FGN bot to post into a specific channel. Right-click a Discord channel → Copy Channel ID
        (Developer Mode required). The bot must be a member of the server with Send Messages + Embed Links permission.
        Leave Tenant ID blank for the global FGN server.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
        <Select value={form.purpose} onValueChange={(v) => setForm((p) => ({ ...p, purpose: v }))}>
          <SelectTrigger className="bg-background sm:col-span-2"><SelectValue placeholder="Purpose" /></SelectTrigger>
          <SelectContent>
            {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Channel ID"
          value={form.channel_id}
          onChange={(e) => setForm((p) => ({ ...p, channel_id: e.target.value }))}
          className="bg-background sm:col-span-2 font-mono text-xs"
        />
        <Input
          placeholder="Guild ID (optional)"
          value={form.guild_id}
          onChange={(e) => setForm((p) => ({ ...p, guild_id: e.target.value }))}
          className="bg-background font-mono text-xs"
        />
        <Input
          placeholder="Tenant ID (optional)"
          value={form.tenant_id}
          onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}
          className="bg-background font-mono text-xs"
        />
        <Input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          className="bg-background text-xs sm:col-span-5"
        />
        <Button onClick={add} disabled={adding} className="font-heading sm:col-span-1">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bot channel routes configured.</p>
      ) : (
        <div className="space-y-2">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm border border-border rounded p-2 bg-background">
              <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Off"}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{r.purpose}</span>
              <span className="font-mono text-xs">#{r.channel_id}</span>
              {r.tenant_id && <Badge variant="outline" className="text-[10px] font-mono">{r.tenant_id.slice(0, 8)}</Badge>}
              {r.notes && <span className="text-xs text-muted-foreground truncate flex-1">{r.notes}</span>}
              {!r.notes && <span className="flex-1" />}
              <Button size="icon" variant="ghost" onClick={() => test(r)} disabled={testing === r.id} title="Test">
                {testing === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => toggle(r)} title="Toggle"><RefreshCw className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)} title="Delete"><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscordChannelRouteManager;
