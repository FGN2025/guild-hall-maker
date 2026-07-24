import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgentLaunchGate, useAgentRuns } from "@/hooks/useAgentRuns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = { tenantId: string; role: "admin" | "manager" | "marketing" | string };

const ARCHETYPES = [
  { value: "tournament_promo", label: "Tournament / Event Promo" },
  { value: "challenge_launch", label: "Challenge Launch" },
  { value: "subscriber_engagement", label: "Subscriber Engagement" },
  { value: "workforce_pathway", label: "Workforce Pathway" },
  { value: "results_recap", label: "Results Recap" },
  { value: "operator_thought_leadership", label: "Operator Thought Leadership" },
];

export default function AgentLaunchCard({ tenantId, role }: Props) {
  const canLaunch = role === "admin" || role === "manager";
  const gate = useAgentLaunchGate();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"single_campaign" | "weekly_slate">("single_campaign");
  const [archetype, setArchetype] = useState<string>("");
  const [anchor, setAnchor] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [launching, setLaunching] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["upcoming_events_for_agent", tenantId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [ev, tr] = await Promise.all([
        supabase.from("tenant_events" as any).select("id, title, event_date").eq("tenant_id", tenantId).gte("event_date", now).order("event_date").limit(30),
        supabase.from("tournaments" as any).select("id, name, start_date").eq("tenant_id", tenantId).gte("start_date", now).order("start_date").limit(30),
      ]);
      const list: { key: string; label: string; kind: "event" | "tournament"; id: string }[] = [];
      for (const e of (ev.data ?? []) as any[]) list.push({ key: `event:${e.id}`, label: `Event · ${e.title}`, kind: "event", id: e.id });
      for (const t of (tr.data ?? []) as any[]) list.push({ key: `tournament:${t.id}`, label: `Tournament · ${t.name}`, kind: "tournament", id: t.id });
      return list;
    },
    enabled: !!tenantId,
  });

  const { data: runs = [], refetch } = useAgentRuns(tenantId, { pollActive: !!activeRunId });
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;
  if (activeRun && (activeRun.status === "succeeded" || activeRun.status === "failed") && activeRunId === activeRun.id) {
    // stop polling on next render
    setTimeout(() => setActiveRunId(null), 0);
  }

  const launch = async () => {
    setLaunching(true);
    try {
      const anchorParts = anchor ? anchor.split(":") : [];
      const anchor_event_id = anchorParts[0] === "event" ? anchorParts[1] : undefined;
      const anchor_tournament_id = anchorParts[0] === "tournament" ? anchorParts[1] : undefined;
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          mode,
          archetype: archetype || undefined,
          anchor_event_id,
          anchor_tournament_id,
          instruction: instruction || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Launch failed", description: body.error ?? `HTTP ${res.status}`, variant: "destructive" });
      } else {
        toast({ title: "Agent run launched", description: `Run ${body.run_id.slice(0, 8)}…` });
        setActiveRunId(body.run_id);
        qc.invalidateQueries({ queryKey: ["agent_runs", tenantId] });
        refetch();
      }
    } catch (e: any) {
      toast({ title: "Launch failed", description: e.message, variant: "destructive" });
    } finally {
      setLaunching(false);
    }
  };

  if (!canLaunch) return null;

  const disabled = !gate.data?.enabled;

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>Run Marketing Agent</CardTitle>
          {disabled && <Badge variant="destructive">disabled</Badge>}
          {activeRun && <Badge>{activeRun.status}</Badge>}
        </div>
        <CardDescription>
          {disabled
            ? "Agent launches are currently disabled by platform admin."
            : "Launches a Claude-powered planning session. All output lands as pending_review drafts for your approval."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_campaign">Single campaign</SelectItem>
                <SelectItem value="weekly_slate">Weekly slate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Archetype (optional)</Label>
            <Select value={archetype} onValueChange={setArchetype}>
              <SelectTrigger><SelectValue placeholder="Auto-select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-select</SelectItem>
                {ARCHETYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Anchor event (optional)</Label>
          <Select value={anchor} onValueChange={setAnchor}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {events.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Launcher instruction (optional, 500 char max)</Label>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value.slice(0, 500))}
            placeholder="Any specific focus for this run…"
            className="min-h-[80px]"
          />
          <div className="text-xs text-muted-foreground text-right">{instruction.length}/500</div>
        </div>

        <div className="flex gap-2">
          <Button onClick={launch} disabled={disabled || launching || !!activeRun}>
            {(launching || activeRun) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeRun ? `Run ${activeRun.status}…` : "Launch"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/tenant/marketing?tab=agent")}>
            Open Agent Drafts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
