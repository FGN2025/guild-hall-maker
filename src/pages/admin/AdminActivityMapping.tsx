import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Link2, Plus, Sparkles, Unlink } from "lucide-react";
import {
  useSimulationActivities,
  suggestActivitiesForChallenge,
  type MappingStatus,
} from "@/hooks/useSimulationActivities";
import usePageTitle from "@/hooks/usePageTitle";

const STATUSES: MappingStatus[] = ["matched", "needs_review", "legacy", "retired", "orphaned_source"];

const statusTone: Record<string, string> = {
  matched: "bg-primary/15 text-primary border-primary/30",
  needs_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  legacy: "bg-muted text-muted-foreground border-border",
  retired: "bg-muted text-muted-foreground border-border",
  orphaned_source: "bg-destructive/15 text-destructive border-destructive/30",
};

const AdminActivityMapping = () => {
  usePageTitle("Activity Mapping");
  const {
    activities,
    mappings,
    challenges,
    challengesLoading,
    createActivity,
    updateActivity,
    linkChallenge,
    unlinkChallenge,
    setMappingStatus,
    setClassification,
  } = useSimulationActivities();

  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [viewFilter, setViewFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createFor, setCreateFor] = useState<any | null>(null);
  const [draft, setDraft] = useState({
    canonical_name: "",
    canonical_description: "",
    game_id: "",
    game_version: "",
    activity_category: "",
    industry_domain: "",
  });

  const mappingByChallenge = useMemo(() => {
    const m = new Map<string, any>();
    mappings.forEach((row: any) => {
      if (row.challenge_task_id === null && row.is_primary) m.set(row.challenge_id, row);
    });
    return m;
  }, [mappings]);

  const { data: allGames = [] } = useQuery({
    queryKey: ["activity-mapping-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const games = useMemo(() => {
    const seen = new Map<string, string>();
    (allGames as any[]).forEach((g) => seen.set(g.id, g.name));
    challenges.forEach((c: any) => {
      if (c.game_id && c.games?.name) seen.set(c.game_id, c.games.name);
    });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [challenges, allGames]);

  const rows = useMemo(() => {
    return challenges.filter((c: any) => {
      if (gameFilter !== "all" && c.game_id !== gameFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      const mapped = !!c.simulation_activity_id;
      if (viewFilter === "unmapped" && mapped) return false;
      if (viewFilter === "mapped" && !mapped) return false;
      if (viewFilter === "entertainment" && c.content_classification !== "entertainment_only") return false;
      if (viewFilter === "unclassified" && c.content_classification) return false;
      return true;
    });
  }, [challenges, gameFilter, search, viewFilter]);

  const openCreate = (challenge: any | null) => {
    setCreateFor(challenge);
    setDraft({
      canonical_name: challenge?.name ?? "",
      canonical_description: "",
      game_id: challenge?.game_id ?? "",
      game_version: "",
      activity_category: "",
      industry_domain: "",
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!draft.canonical_name.trim() || !draft.game_id) return;
    const created = await createActivity.mutateAsync({
      canonical_name: draft.canonical_name.trim(),
      canonical_description: draft.canonical_description || null,
      game_id: draft.game_id,
      game_version: draft.game_version || null,
      activity_category: draft.activity_category || null,
      industry_domain: draft.industry_domain || null,
      status: "active",
      source_challenge_id: createFor?.id ?? null,
    });
    if (createFor) {
      await linkChallenge.mutateAsync({ challengeId: createFor.id, activityId: created.id });
      await setClassification.mutateAsync({ challengeId: createFor.id, classification: "simulation" });
    }
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide">Activity Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Internal canonical identity for simulation activities. Not visible to players.
          </p>
        </div>
        <Button onClick={() => openCreate(null)} className="gap-2">
          <Plus className="h-4 w-4" /> New Activity
        </Button>
      </div>

      <Tabs defaultValue="challenges">
        <TabsList>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72"
            />
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All games</SelectItem>
                {games.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewFilter} onValueChange={setViewFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All challenges</SelectItem>
                <SelectItem value="mapped">Mapped</SelectItem>
                <SelectItem value="unmapped">Unmapped</SelectItem>
                <SelectItem value="entertainment">Entertainment only</SelectItem>
                <SelectItem value="unclassified">Unclassified</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto self-center text-sm text-muted-foreground">
              {rows.length} of {challenges.length}
            </div>
          </div>

          {challengesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              {rows.map((c: any) => {
                const mapping = mappingByChallenge.get(c.id);
                const activity = activities.find((a: any) => a.id === c.simulation_activity_id);
                const suggestions = c.simulation_activity_id
                  ? []
                  : suggestActivitiesForChallenge(c, activities);
                return (
                  <Collapsible key={c.id} className="rounded-lg border border-border bg-card">
                    <div className="flex flex-wrap items-center gap-3 p-4">
                      <CollapsibleTrigger className="flex flex-1 items-center gap-3 text-left min-w-0">
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {c.games?.name ?? "No game"} · {c.id}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex flex-wrap items-center gap-2">
                        {c.content_classification && (
                          <Badge variant="outline" className="text-xs">
                            {c.content_classification === "simulation" ? "Simulation" : "Entertainment only"}
                          </Badge>
                        )}
                        {mapping && (
                          <Badge variant="outline" className={`text-xs ${statusTone[mapping.mapping_status] ?? ""}`}>
                            {mapping.mapping_status}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {activity ? activity.canonical_name : "No activity"}
                        </Badge>
                        {activity && c.game_id && activity.game_id && activity.game_id !== c.game_id && (
                          <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">
                            Game mismatch
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CollapsibleContent className="space-y-4 border-t border-border p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Content classification</Label>
                          <Select
                            value={c.content_classification ?? "unset"}
                            onValueChange={(v) =>
                              setClassification.mutate({
                                challengeId: c.id,
                                classification: v === "unset" ? null : (v as any),
                              })
                            }
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Unclassified</SelectItem>
                              <SelectItem value="simulation">Simulation</SelectItem>
                              <SelectItem value="entertainment_only">Entertainment only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Canonical simulation activity</Label>
                          <div className="flex gap-2">
                            <Select
                              value={c.simulation_activity_id ?? "none"}
                              onValueChange={(v) => {
                                if (v === "none") unlinkChallenge.mutate(c.id);
                                else linkChallenge.mutate({ challengeId: c.id, activityId: v });
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Not mapped" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Not mapped</SelectItem>
                                {activities.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>{a.canonical_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => openCreate(c)} className="gap-1.5 shrink-0">
                              <Plus className="h-3.5 w-3.5" /> New
                            </Button>
                          </div>
                          {activity && (
                            <p className="text-xs text-muted-foreground break-all">
                              simulation_activity_id: {activity.id}
                            </p>
                          )}
                        </div>

                        {mapping && (
                          <div className="space-y-2">
                            <Label className="text-xs">Mapping status</Label>
                            <Select
                              value={mapping.mapping_status}
                              onValueChange={(v) =>
                                setMappingStatus.mutate({ mappingId: mapping.id, status: v as MappingStatus })
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {mapping && (
                          <div className="flex items-end">
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => unlinkChallenge.mutate(c.id)}>
                              <Unlink className="h-3.5 w-3.5" /> Remove mapping
                            </Button>
                          </div>
                        )}
                      </div>

                      {suggestions.length > 0 && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-400">
                            <Sparkles className="h-3.5 w-3.5" /> Suggestions (advisory only — nothing is mapped until you accept)
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                              <Button
                                key={s.activity.id}
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() =>
                                  linkChallenge.mutate({ challengeId: c.id, activityId: s.activity.id })
                                }
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                {s.activity.canonical_name} ({Math.round(s.similarity * 100)}%)
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs">Challenge tasks (IDs preserved)</Label>
                        <div className="mt-2 space-y-1">
                          {[...(c.challenge_tasks ?? [])]
                            .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
                            .map((t: any) => (
                              <div key={t.id} className="flex flex-wrap gap-2 text-xs">
                                <span className="font-medium">{t.title}</span>
                                <span className="text-muted-foreground break-all">{t.id}</span>
                              </div>
                            ))}
                          {(c.challenge_tasks ?? []).length === 0 && (
                            <p className="text-xs text-muted-foreground">No tasks.</p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activities" className="space-y-3">
          {activities.map((a: any) => {
            const linked = mappings.filter((m: any) => m.simulation_activity_id === a.id);
            return (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {a.canonical_name}
                    <Badge variant="outline" className="text-xs">{a.status}</Badge>
                    <Badge variant="outline" className="text-xs">{a.games?.name ?? a.game_id}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{a.canonical_description}</p>
                  <p className="text-xs text-muted-foreground break-all">simulation_activity_id: {a.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.activity_category ?? "—"} · {a.industry_domain ?? "—"} · {linked.length} linked challenge(s)
                  </p>
                  <div className="flex gap-2 pt-1">
                    {a.status !== "retired" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateActivity.mutate({ id: a.id, status: "retired" })}
                      >
                        Retire
                      </Button>
                    )}
                    {a.status !== "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateActivity.mutate({ id: a.id, status: "active" })}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {activities.length === 0 && <p className="text-sm text-muted-foreground">No activities yet.</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{createFor ? "Create activity from challenge" : "New simulation activity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Canonical name</Label>
              <Input
                value={draft.canonical_name}
                onChange={(e) => setDraft({ ...draft, canonical_name: e.target.value })}
                placeholder="e.g. Interior Surface Preparation and Painting"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Canonical description</Label>
              <Textarea
                value={draft.canonical_description}
                onChange={(e) => setDraft({ ...draft, canonical_description: e.target.value })}
                placeholder="What the person actually does in the simulation."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Game</Label>
                <Select value={draft.game_id} onValueChange={(v) => setDraft({ ...draft, game_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select game" /></SelectTrigger>
                  <SelectContent>
                    {games.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Game version</Label>
                <Input
                  value={draft.game_version}
                  onChange={(e) => setDraft({ ...draft, game_version: e.target.value })}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Activity category</Label>
                <Input
                  value={draft.activity_category}
                  onChange={(e) => setDraft({ ...draft, activity_category: e.target.value })}
                  placeholder="e.g. inspection"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry domain</Label>
                <Input
                  value={draft.industry_domain}
                  onChange={(e) => setDraft({ ...draft, industry_domain: e.target.value })}
                  placeholder="e.g. construction"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!draft.canonical_name.trim() || !draft.game_id}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActivityMapping;
