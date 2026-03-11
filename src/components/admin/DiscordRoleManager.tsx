import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, RefreshCw, MessageSquare } from "lucide-react";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface RoleMapping {
  id: string;
  discord_role_id: string;
  discord_role_name: string;
  trigger_condition: string;
  condition_value: string | null;
  platform_role: string | null;
  is_active: boolean;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  on_link: "On Discord Link",
  on_achievement: "On Achievement Earned",
  on_rank: "On Quest Rank Change",
  on_tournament_win: "On Tournament Win",
  manual: "Manual Assignment",
};

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  all: "All Users",
  admin: "Admin",
  moderator: "Moderator",
  tenant_admin: "Tenant Admin",
  user: "Regular User",
};

const DiscordRoleManager = () => {
  const [serverRoles, setServerRoles] = useState<DiscordRole[]>([]);
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(true);
  const [adding, setAdding] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState("on_link");
  const [selectedPlatformRole, setSelectedPlatformRole] = useState("all");

  const fetchMappings = async () => {
    setLoadingMappings(true);
    const { data, error } = await supabase
      .from("discord_role_mappings" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMappings((data as any) ?? []);
    }
    setLoadingMappings(false);
  };

  const fetchServerRoles = async () => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase.functions.invoke("discord-server-roles");
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Discord Error", description: data.error, variant: "destructive" });
      } else {
        setServerRoles(data?.roles ?? []);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to fetch server roles", variant: "destructive" });
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleAdd = async () => {
    if (!selectedRoleId) {
      toast({ title: "Select a role", variant: "destructive" });
      return;
    }
    const role = serverRoles.find((r) => r.id === selectedRoleId);
    if (!role) return;

    setAdding(true);
    const { error } = await supabase
      .from("discord_role_mappings" as any)
      .insert({
        discord_role_id: role.id,
        discord_role_name: role.name,
        trigger_condition: selectedTrigger,
        platform_role: selectedPlatformRole === "all" ? null : selectedPlatformRole,
        is_active: true,
      } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mapping added" });
      setSelectedRoleId("");
      setSelectedPlatformRole("all");
      fetchMappings();
    }
    setAdding(false);
  };

  const toggleActive = async (mapping: RoleMapping) => {
    const { error } = await supabase
      .from("discord_role_mappings" as any)
      .update({ is_active: !mapping.is_active } as any)
      .eq("id", mapping.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMappings((prev) =>
        prev.map((m) => (m.id === mapping.id ? { ...m, is_active: !m.is_active } : m))
      );
    }
  };

  const deleteMapping = async (id: string) => {
    const { error } = await supabase
      .from("discord_role_mappings" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMappings((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Mapping removed" });
    }
  };

  const colorToHex = (color: number) =>
    color === 0 ? "#99AAB5" : `#${color.toString(16).padStart(6, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#5865F2]" />
          <h3 className="font-heading text-lg">Discord Role Mappings</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchServerRoles}
          disabled={loadingRoles}
        >
          {loadingRoles ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1">Fetch Server Roles</span>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Map Discord server roles to platform events and roles. You can assign different Discord roles based on the user's platform role (Admin, Moderator, Tenant Admin, or Regular User).
      </p>

      {/* Add mapping form */}
      {serverRoles.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-muted/30 p-4">
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="text-xs font-heading text-muted-foreground">Discord Role</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role…" />
              </SelectTrigger>
              <SelectContent>
                {serverRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: colorToHex(r.color) }}
                      />
                      {r.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <label className="text-xs font-heading text-muted-foreground">Trigger</label>
            <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <label className="text-xs font-heading text-muted-foreground">Platform Role</label>
            <Select value={selectedPlatformRole} onValueChange={setSelectedPlatformRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_ROLE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={adding || !selectedRoleId} size="sm" className="gap-1">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Mapping
          </Button>
        </div>
      )}

      {serverRoles.length === 0 && !loadingRoles && (
        <p className="text-sm text-muted-foreground italic">
          Click "Fetch Server Roles" to load available roles from the FGN Discord server.
        </p>
      )}

      {/* Existing mappings */}
      {loadingMappings ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading mappings…
        </div>
      ) : mappings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No role mappings configured yet. The system will fall back to the default DISCORD_VERIFIED_ROLE_ID.</p>
      ) : (
        <div className="space-y-2">
          {mappings.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <Switch
                checked={m.is_active}
                onCheckedChange={() => toggleActive(m)}
              />
              <Badge variant="outline" className="font-mono text-xs">
                {m.discord_role_name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {TRIGGER_LABELS[m.trigger_condition] ?? m.trigger_condition}
              </Badge>
              <Badge variant="default" className="text-xs">
                {m.platform_role ? PLATFORM_ROLE_LABELS[m.platform_role] ?? m.platform_role : "All Users"}
              </Badge>
              {m.condition_value && (
                <span className="text-xs text-muted-foreground">= {m.condition_value}</span>
              )}
              <span className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteMapping(m.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscordRoleManager;
