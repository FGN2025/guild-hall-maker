import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Award, Search, X, Sparkles } from "lucide-react";
import { useAchievementDefinitions, useAchievementAdmin, useRecentAwards } from "@/hooks/useAchievementAdmin";
import type { AchievementDefinition } from "@/hooks/useAchievementAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { ACHIEVEMENT_ICON_KEYS, getAchievementIcon } from "@/lib/achievementIcons";
const ICONS = ACHIEVEMENT_ICON_KEYS;
const TIERS = ["bronze", "silver", "gold", "platinum"];

const tierColor: Record<string, string> = {
  bronze: "text-orange-400",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
};

// ---------- Definition Form ----------
const DefForm = ({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: AchievementDefinition;
  onSubmit: (data: Partial<AchievementDefinition>) => void;
  onClose: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "trophy");
  const [tier, setTier] = useState(initial?.tier ?? "bronze");
  const [category, setCategory] = useState(initial?.category ?? "custom");
  const [maxProgress, setMaxProgress] = useState<string>(initial?.max_progress?.toString() ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [order, setOrder] = useState<string>(initial?.display_order?.toString() ?? "0");

  const handle = () => {
    onSubmit({
      ...(initial ? { id: initial.id } : {}),
      name,
      description,
      icon,
      tier,
      category,
      max_progress: maxProgress ? parseInt(maxProgress) : null,
      is_active: isActive,
      display_order: parseInt(order) || 0,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Icon</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="milestone">Milestone (auto)</SelectItem>
              <SelectItem value="custom">Custom (manual)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Max Progress</Label>
          <Input type="number" value={maxProgress} onChange={(e) => setMaxProgress(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Display Order</Label>
          <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Active</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handle} disabled={!name || !description}>Save</Button>
      </div>
    </div>
  );
};

// ---------- Definitions Tab ----------
const DefinitionsTab = () => {
  const { data: defs, isLoading } = useAchievementDefinitions();
  const { createDef, updateDef, deleteDef } = useAchievementAdmin();
  const [editItem, setEditItem] = useState<AchievementDefinition | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display text-lg font-semibold text-foreground">Achievement Definitions</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Achievement</DialogTitle></DialogHeader>
            <DefForm onSubmit={(d) => createDef.mutate(d)} onClose={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-center py-3 px-2">Tier</th>
                <th className="text-center py-3 px-2">Category</th>
                <th className="text-center py-3 px-2">Active</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {defs?.map((d) => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 font-heading font-medium text-foreground">{d.name}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs font-display uppercase ${tierColor[d.tier] ?? "text-muted-foreground"}`}>{d.tier}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant={d.category === "milestone" ? "secondary" : "outline"}>{d.category}</Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant={d.is_active ? "default" : "destructive"}>{d.is_active ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditItem(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteDef.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Achievement</DialogTitle></DialogHeader>
          {editItem && <DefForm initial={editItem} onSubmit={(d) => updateDef.mutate(d as any)} onClose={() => setEditItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Award Tab ----------
const AwardTab = () => {
  const { data: defs } = useAchievementDefinitions();
  const { data: recentAwards, isLoading } = useRecentAwards();
  const { awardAchievement, bulkAwardAchievement, createDef, revokeAchievement } = useAchievementAdmin();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState("");
  const [notes, setNotes] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const customDefs = defs?.filter((d) => d.is_active && d.category === "custom") ?? [];
  const milestoneDefs = defs?.filter((d) => d.is_active && d.category === "milestone") ?? [];

  const searchPlayers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setPlayers([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${q}%`)
      .limit(10);
    setPlayers(data ?? []);
  };

  const togglePlayer = (p: { user_id: string; display_name: string; avatar_url: string | null }) => {
    setSelectedPlayers((prev) =>
      prev.some((s) => s.user_id === p.user_id)
        ? prev.filter((s) => s.user_id !== p.user_id)
        : [...prev, p]
    );
  };

  const handleAward = () => {
    if (!selectedPlayers.length || !selectedAchievement || !user) return;
    if (selectedPlayers.length === 1) {
      awardAchievement.mutate({
        user_id: selectedPlayers[0].user_id,
        achievement_id: selectedAchievement,
        notes,
        awarded_by: user.id,
      });
    } else {
      bulkAwardAchievement.mutate({
        user_ids: selectedPlayers.map((p) => p.user_id),
        achievement_id: selectedAchievement,
        notes,
        awarded_by: user.id,
      });
    }
    setSelectedPlayers([]);
    setSelectedAchievement("");
    setNotes("");
    setSearch("");
  };

  const handleQuickCreate = (data: Partial<AchievementDefinition>) => {
    createDef.mutate({ ...data, category: "custom" });
    setShowQuickCreate(false);
  };

  const defMap = new Map(defs?.map((d) => [d.id, d]) ?? []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" /> Award Achievement
        </h2>

        {/* Player multi-select */}
        <div>
          <Label>Players</Label>
          {selectedPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedPlayers.map((p) => (
                <div key={p.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border bg-muted/30 text-sm">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">{(p.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-heading text-foreground">{p.display_name}</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => togglePlayer(p)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search players…" value={search} onChange={(e) => searchPlayers(e.target.value)} />
            {players.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                {players.map((p) => {
                  const isSelected = selectedPlayers.some((s) => s.user_id === p.user_id);
                  return (
                    <button key={p.user_id} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 text-left" onClick={() => { togglePlayer(p); setSearch(""); setPlayers([]); }}>
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{(p.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-heading text-foreground">{p.display_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Achievement select - grouped */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Achievement</Label>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowQuickCreate(true)}>
              <Sparkles className="h-3 w-3" /> Quick Create
            </Button>
          </div>
          <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
            <SelectTrigger><SelectValue placeholder="Select achievement…" /></SelectTrigger>
            <SelectContent>
              {customDefs.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-purple-400">Custom Badges</SelectLabel>
                  {customDefs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-purple-400 inline" /> {d.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {milestoneDefs.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Milestone Achievements</SelectLabel>
                  {milestoneDefs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className={tierColor[d.tier]}>{d.tier}</span> — {d.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for awarding…" />
        </div>

        <Button onClick={() => setShowConfirm(true)} disabled={!selectedPlayers.length || !selectedAchievement || awardAchievement.isPending || bulkAwardAchievement.isPending}>
          Award Badge{selectedPlayers.length > 1 ? ` to ${selectedPlayers.length} Players` : ""}
        </Button>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Award</AlertDialogTitle>
              <AlertDialogDescription>
                Award <span className="font-semibold text-foreground">{defs?.find(d => d.id === selectedAchievement)?.name ?? "this badge"}</span> to{" "}
                <span className="font-semibold text-foreground">
                  {selectedPlayers.length === 1 ? selectedPlayers[0].display_name : `${selectedPlayers.length} players`}
                </span>? This action cannot be easily undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowConfirm(false); handleAward(); }}>Award</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Quick Create Dialog */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quick Create Custom Badge</DialogTitle></DialogHeader>
          <DefForm onSubmit={handleQuickCreate} onClose={() => setShowQuickCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Recent manual awards */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-foreground">Recent Manual Awards</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : !recentAwards?.length ? (
          <p className="p-4 text-sm text-muted-foreground">No manual awards yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Player</th>
                  <th className="text-left py-3 px-2">Achievement</th>
                  <th className="text-left py-3 px-2">Notes</th>
                  <th className="text-left py-3 px-2">Date</th>
                  <th className="text-right py-3 px-4">Revoke</th>
                </tr>
              </thead>
              <tbody>
                {recentAwards.map((a) => {
                  const def = defMap.get(a.achievement_id);
                  return (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={a.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">{(a.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-heading text-foreground">{a.display_name ?? a.user_id.slice(0, 8) + "…"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-foreground">{def?.name ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground truncate max-w-[200px]">{a.notes ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{new Date(a.awarded_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => revokeAchievement.mutate(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Main Page ----------
const AdminAchievements = () => (
  <div className="space-y-6">
    <h1 className="font-display text-3xl font-bold text-foreground">Achievements</h1>
    <Tabs defaultValue="definitions">
      <TabsList>
        <TabsTrigger value="definitions">Definitions</TabsTrigger>
        <TabsTrigger value="award">Award</TabsTrigger>
      </TabsList>
      <TabsContent value="definitions"><DefinitionsTab /></TabsContent>
      <TabsContent value="award"><AwardTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminAchievements;
