import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Play, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { usePointsRubric, useUpdatePointsRubric, useRubricAuditLog, useRealignmentLog } from "@/hooks/usePointsRubric";
import { DEFAULT_RUBRIC, type PointsRubric, type Difficulty, type ChallengeType, getRecommendedPoints } from "@/lib/pointsRubric";

const DIFFS: Difficulty[] = ["beginner", "intermediate", "advanced"];
const TYPES: ChallengeType[] = ["daily", "weekly", "monthly", "one_time"];

const RubricMatrix = ({
  title,
  matrix,
  onChange,
}: {
  title: string;
  matrix: Record<Difficulty, Record<ChallengeType, number>>;
  onChange: (d: Difficulty, t: ChallengeType, v: number) => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="font-display text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-heading text-muted-foreground">Difficulty</th>
              {TYPES.map((t) => (
                <th key={t} className="text-center py-2 font-heading text-muted-foreground capitalize">
                  {t.replace("_", "-")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIFFS.map((d) => (
              <tr key={d} className="border-b border-border/40">
                <td className="py-2 font-heading capitalize">{d}</td>
                {TYPES.map((t) => (
                  <td key={t} className="py-1 px-1">
                    <Input
                      type="number"
                      min={0}
                      value={matrix[d][t]}
                      onChange={(e) => onChange(d, t, parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const AdminPointsRubric = () => {
  const { data: stored, isLoading } = usePointsRubric();
  const updateMut = useUpdatePointsRubric();
  const { data: auditLog = [] } = useRubricAuditLog();
  const { data: realignLog = [] } = useRealignmentLog();
  const [draft, setDraft] = useState<PointsRubric>(DEFAULT_RUBRIC);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    if (stored) setDraft(stored);
  }, [stored]);

  const dirty = useMemo(() => JSON.stringify(stored) !== JSON.stringify(draft), [stored, draft]);

  // Audit query — count off-rubric items
  const { data: audit } = useQuery({
    queryKey: ["points-audit", draft.version, JSON.stringify(draft)],
    queryFn: async () => {
      const [chRes, qRes, tRes] = await Promise.all([
        supabase.from("challenges").select("id, points_reward, difficulty, challenge_type, points_override_reason"),
        supabase.from("quests").select("id, points_reward, difficulty, quest_type, points_override_reason"),
        supabase.from("tournaments").select("id, points_first, points_second, points_third, points_participation, difficulty, points_override_reason"),
      ]);
      const challenges = (chRes.data ?? []).filter((c: any) => {
        if (c.points_override_reason) return false;
        const rec = getRecommendedPoints(draft, "challenge", c.difficulty, c.challenge_type);
        return c.points_reward !== rec;
      });
      const quests = (qRes.data ?? []).filter((q: any) => {
        if (q.points_override_reason) return false;
        const rec = getRecommendedPoints(draft, "quest", q.difficulty, q.quest_type);
        return q.points_reward !== rec;
      });
      const tournaments = (tRes.data ?? []).filter((t: any) => {
        if (t.points_override_reason) return false;
        const rec = getRecommendedPoints(draft, "tournament", t.difficulty, null, "participation");
        return t.points_participation !== rec;
      });
      return {
        challenges: challenges.length,
        quests: quests.length,
        tournaments: tournaments.length,
        total: challenges.length + quests.length + tournaments.length,
      };
    },
  });

  const setMatrix = (kind: "challenges" | "quests") =>
    (d: Difficulty, t: ChallengeType, v: number) =>
      setDraft({ ...draft, [kind]: { ...draft[kind], [d]: { ...draft[kind][d], [t]: v } } });

  const runRealign = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("align-points-to-rubric", {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      toast.success(
        dryRun
          ? `Dry run: ${data.changes_count} item(s) would be updated`
          : `Realigned ${data.changes_count} item(s)`,
      );
    } catch (e: any) {
      toast.error(e.message ?? "Realign failed");
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary tracking-wider">Points Rubric</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central source of truth for points across challenges, quests, tournaments, and prizes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => stored && setDraft(stored)} disabled={!dirty}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button onClick={() => updateMut.mutate({ rubric: draft })} disabled={!dirty || updateMut.isPending}>
            {updateMut.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Rubric
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="audit">Audit & Realign</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Enforcement Mode</CardTitle>
              <CardDescription>How strictly the rubric is applied when admins create or edit items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={draft.enforcement} onValueChange={(v: any) => setDraft({ ...draft, enforcement: v })}>
                <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suggest">Suggest — show recommended value, no warnings</SelectItem>
                  <SelectItem value="warn">Warn — show inline warnings on deviation</SelectItem>
                  <SelectItem value="enforce">Enforce — require override reason on deviation</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <RubricMatrix title="Challenges (points by difficulty × type)" matrix={draft.challenges} onChange={setMatrix("challenges")} />
          <RubricMatrix title="Quests (points by difficulty × type)" matrix={draft.quests} onChange={setMatrix("quests")} />

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Tournaments</CardTitle>
              <CardDescription>Per-match participation points + placement multipliers.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Participation (per match)</Label>
                {DIFFS.map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <span className="capitalize text-sm w-32">{d}</span>
                    <Input
                      type="number" min={0}
                      value={draft.tournaments.participation[d]}
                      onChange={(e) => setDraft({
                        ...draft,
                        tournaments: { ...draft.tournaments, participation: { ...draft.tournaments.participation, [d]: parseInt(e.target.value) || 0 } },
                      })}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Placement multipliers</Label>
                {(["first", "second", "third"] as const).map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="capitalize text-sm w-32">{p} place ×</span>
                    <Input
                      type="number" min={0} step={0.5}
                      value={draft.tournaments.placement_multipliers[p]}
                      onChange={(e) => setDraft({
                        ...draft,
                        tournaments: {
                          ...draft.tournaments,
                          placement_multipliers: { ...draft.tournaments.placement_multipliers, [p]: parseFloat(e.target.value) || 0 },
                        },
                      })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Prize Bands (recommended cost ranges)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(draft.prize_bands).map(([rarity, [min, max]]) => (
                <div key={rarity} className="flex items-center gap-2">
                  <span className="capitalize text-sm w-24">{rarity}</span>
                  <Input
                    type="number" min={0} value={min}
                    onChange={(e) => setDraft({ ...draft, prize_bands: { ...draft.prize_bands, [rarity]: [parseInt(e.target.value) || 0, max] } })}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number" min={0} value={max}
                    onChange={(e) => setDraft({ ...draft, prize_bands: { ...draft.prize_bands, [rarity]: [min, parseInt(e.target.value) || 0] } })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Off-Rubric Items</CardTitle>
              <CardDescription>Items whose current points don't match the rubric (excluding overrides).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {audit ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Challenges" value={audit.challenges} />
                  <Stat label="Quests" value={audit.quests} />
                  <Stat label="Tournaments" value={audit.tournaments} />
                  <Stat label="Total" value={audit.total} highlight />
                </div>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Bulk Realign
              </CardTitle>
              <CardDescription>
                Updates non-overridden items to match the saved rubric. Run a dry run first to preview.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="text-xs">
                  Items with a manual override reason are always skipped. All changes are logged in the realignment log.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-3">
                <Select value={dryRun ? "dry" : "live"} onValueChange={(v) => setDryRun(v === "dry")}>
                  <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dry">Dry run (preview)</SelectItem>
                    <SelectItem value="live">Live run (apply)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={runRealign} disabled={running}>
                  {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                  {dryRun ? "Run Dry Run" : "Run Realign"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Rubric Edits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No edits yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {auditLog.map((row: any) => (
                    <li key={row.id} className="flex justify-between border-b border-border/40 py-1.5">
                      <span className="text-muted-foreground">{new Date(row.changed_at).toLocaleString()}</span>
                      <span className="text-xs">v{(row.new_value as any)?.version ?? "?"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Realignment Log</CardTitle>
            </CardHeader>
            <CardContent>
              {realignLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No realignments yet.</p>
              ) : (
                <ul className="space-y-1 text-xs font-mono max-h-96 overflow-y-auto">
                  {realignLog.map((row: any) => (
                    <li key={row.id} className="flex justify-between gap-2 border-b border-border/30 py-1">
                      <span><Badge variant="outline" className="mr-2">{row.item_type}</Badge>{row.field_name}</span>
                      <span className="text-muted-foreground">{row.old_value} → {row.new_value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
  <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "border-border"}`}>
    <div className="text-xs text-muted-foreground font-heading uppercase">{label}</div>
    <div className={`text-2xl font-display ${highlight ? "text-primary" : ""}`}>{value}</div>
  </div>
);

export default AdminPointsRubric;
