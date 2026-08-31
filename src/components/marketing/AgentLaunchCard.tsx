import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgentLaunchGate, useAgentRuns } from "@/hooks/useAgentRuns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, ListChecks } from "lucide-react";
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

/** Next 6 months, oldest first, as YYYY-MM. */
function monthOptions() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    out.push({ value, label: d.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }) });
  }
  return out;
}

/** Inclusive first/last day of a YYYY-MM, as YYYY-MM-DD. */
function monthBounds(ym: string) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, "0")}` };
}

type Preflight = {
  scope: {
    tenant_id: string; tenant_name?: string | null; timezone: string; target_month: string;
    range_start: string; range_end: string; include_kickoff: boolean; density: string;
    instruction: string | null; run_date: string;
  };
  kickoff: { included: boolean; reason: string; scheduled_at?: string | null };
  platforms: string[];
  items: Array<{
    kind: string; id: string; title: string; date: string;
    beats: Array<{ beat: string; action: "create" | "skip"; scheduled_at: string | null; reason: string }>;
  }>;
  expected: { campaigns: number; posts: number; assets: number };
};

export default function AgentLaunchCard({ tenantId, role }: Props) {
  const canLaunch = role === "admin" || role === "manager";
  const gate = useAgentLaunchGate();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const MONTHS = monthOptions();
  const [mode, setMode] = useState<"single_campaign" | "weekly_slate" | "monthly_calendar_seed">("single_campaign");
  const [archetype, setArchetype] = useState<string>("");
  const [anchor, setAnchor] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [launching, setLaunching] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState<string>(MONTHS[0].value);
  const [density, setDensity] = useState<string>("");
  // Structured scope. The range defaults from the month and stays editable;
  // once the user edits it we stop re-deriving it on month change.
  const [rangeStart, setRangeStart] = useState<string>(monthBounds(MONTHS[0].value).start);
  const [rangeEnd, setRangeEnd] = useState<string>(monthBounds(MONTHS[0].value).end);
  const [rangeTouched, setRangeTouched] = useState(false);
  const [includeKickoff, setIncludeKickoff] = useState(true);
  // Pre-flight, computed server side from the same module the runner uses.
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [preflighting, setPreflighting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSeedMode = mode === "monthly_calendar_seed";

  const onMonthChange = (v: string) => {
    setTargetMonth(v);
    setPreflight(null);
    if (!rangeTouched) {
      const b = monthBounds(v);
      setRangeStart(b.start);
      setRangeEnd(b.end);
    }
  };

  // Tenant default seed density — used as the placeholder when the launcher
  // does not override it for this run.
  const { data: tenantDensity } = useQuery({
    queryKey: ["tenant_seed_density", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants" as any)
        .select("marketing_seed_density")
        .eq("id", tenantId)
        .maybeSingle();
      return ((data as any)?.marketing_seed_density ?? "standard") as string;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["upcoming_events_for_agent", tenantId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [ev, tr] = await Promise.all([
        // tenant_events stores the label in `name`; tournaments are platform-wide
        // and carry no tenant_id column, so they are not tenant-filtered here.
        supabase.from("tenant_events" as any).select("id, name, event_date").eq("tenant_id", tenantId).gte("event_date", now).order("event_date").limit(30),
        supabase.from("tournaments" as any).select("id, name, start_date").gte("start_date", now).order("start_date").limit(30),
      ]);
      const list: { key: string; label: string; kind: "event" | "tournament"; id: string }[] = [];
      for (const e of (ev.data ?? []) as any[]) list.push({ key: `event:${e.id}`, label: `Event · ${e.name}`, kind: "event", id: e.id });
      for (const t of (tr.data ?? []) as any[]) list.push({ key: `tournament:${t.id}`, label: `Tournament · ${t.name}`, kind: "tournament", id: t.id });
      return list;
    },
    enabled: !!tenantId,
  });

  const { data: runs = [], refetch } = useAgentRuns(tenantId, { pollActive: !!activeRunId });
  const activeRun = runs.find((r) => r.id === activeRunId) ?? null;
  if (activeRun && activeRun.status !== "running" && activeRunId === activeRun.id) {
    // stop polling on next render
    setTimeout(() => setActiveRunId(null), 0);
  }

  const scopeBody = () => ({
    tenant_id: tenantId,
    target_month: targetMonth,
    range_start: rangeStart,
    range_end: rangeEnd,
    include_kickoff: includeKickoff,
    seed_density: density || undefined,
    instruction: instruction || undefined,
  });

  const runPreflight = async () => {
    setPreflighting(true);
    setPreflight(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-preflight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(scopeBody()),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Pre-flight failed", description: body.error ?? `HTTP ${res.status}`, variant: "destructive" });
        return null;
      }
      setPreflight(body.preflight as Preflight);
      return body.preflight as Preflight;
    } catch (e: any) {
      toast({ title: "Pre-flight failed", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setPreflighting(false);
    }
  };

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
          archetype: isSeedMode ? undefined : archetype || undefined,
          anchor_event_id: isSeedMode ? undefined : anchor_event_id,
          anchor_tournament_id: isSeedMode ? undefined : anchor_tournament_id,
          instruction: instruction || undefined,
          target_month: isSeedMode ? targetMonth : undefined,
          seed_density: isSeedMode ? density || undefined : undefined,
          range_start: isSeedMode ? rangeStart : undefined,
          range_end: isSeedMode ? rangeEnd : undefined,
          include_kickoff: isSeedMode ? includeKickoff : undefined,
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
      setConfirmOpen(false);
    }
  };

  /** Seed runs must show the effective plan before they spend anything. */
  const onLaunchClick = async () => {
    if (!isSeedMode) return launch();
    const pf = preflight ?? (await runPreflight());
    if (pf) setConfirmOpen(true);
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
            <Select value={mode} onValueChange={(v: any) => { setMode(v); setPreflight(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single_campaign">Single campaign</SelectItem>
                <SelectItem value="weekly_slate">Weekly slate</SelectItem>
                <SelectItem value="monthly_calendar_seed">Monthly calendar seed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isSeedMode ? (
            <div>
              <Label>Target month</Label>
              <Select value={targetMonth} onValueChange={onMonthChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Archetype (optional)</Label>
              <Select value={archetype || "__none__"} onValueChange={(v) => setArchetype(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Auto-select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Auto-select</SelectItem>
                  {ARCHETYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isSeedMode ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Range start</Label>
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => { setRangeStart(e.target.value); setRangeTouched(true); setPreflight(null); }}
                />
              </div>
              <div>
                <Label>Range end</Label>
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => { setRangeEnd(e.target.value); setRangeTouched(true); setPreflight(null); }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded border p-2">
              <div>
                <Label className="cursor-pointer">Include monthly kickoff</Label>
                <p className="text-xs text-muted-foreground">
                  Skipped automatically when the month is already underway at run time.
                </p>
              </div>
              <Switch
                checked={includeKickoff}
                onCheckedChange={(v) => { setIncludeKickoff(v); setPreflight(null); }}
              />
            </div>

            <div>
              <Label>Seed density</Label>
              <Select value={density || "__default__"} onValueChange={(v) => { setDensity(v === "__default__" ? "" : v); setPreflight(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Tenant default ({tenantDensity ?? "standard"})</SelectItem>
                  <SelectItem value="light">Light — one day-of post per event</SelectItem>
                  <SelectItem value="standard">Standard — announce plus day-of</SelectItem>
                  <SelectItem value="full">Full — announce, countdown, day-of, recap</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Composition only. The seed lane never generates imagery and never publishes.
              </p>
            </div>
          </>
        ) : (
          <div>
            <Label>Anchor event (optional)</Label>
            <Select value={anchor || "__none__"} onValueChange={(v) => setAnchor(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {events.map((e) => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Launcher instruction (optional, 500 char max)</Label>
          <Textarea
            value={instruction}
            onChange={(e) => { setInstruction(e.target.value.slice(0, 500)); setPreflight(null); }}
            placeholder="Nuance only — scope travels in the fields above…"
            className="min-h-[80px]"
          />
          <div className="text-xs text-muted-foreground text-right">{instruction.length}/500</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onLaunchClick} disabled={disabled || launching || preflighting || !!activeRun}>
            {(launching || preflighting || activeRun) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {activeRun ? `Run ${activeRun.status}…` : isSeedMode ? "Pre-flight & launch" : "Launch"}
          </Button>
          {isSeedMode && (
            <Button variant="secondary" onClick={runPreflight} disabled={preflighting || !!activeRun}>
              <ListChecks className="mr-2 h-4 w-4" />
              Pre-flight only
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/tenant/marketing?tab=agent")}>
            Open Agent Drafts
          </Button>
        </div>

        {isSeedMode && preflight && <PreflightSummary pf={preflight} />}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm run scope</AlertDialogTitle>
            <AlertDialogDescription>
              This is exactly what will be sent to the runner. Nothing outside it will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {preflight && (
            <ScrollArea className="max-h-[50vh] pr-3">
              <PreflightSummary pf={preflight} />
            </ScrollArea>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={launch} disabled={launching}>Launch run</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PreflightSummary({ pf }: { pf: Preflight }) {
  return (
    <div className="rounded border bg-muted/40 p-3 space-y-3 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline">{pf.scope.target_month}</Badge>
        <Badge variant="outline">{pf.scope.range_start} → {pf.scope.range_end}</Badge>
        <Badge variant="outline">density {pf.scope.density}</Badge>
        <Badge variant={pf.kickoff.included ? "default" : "secondary"}>
          kickoff {pf.kickoff.included ? "included" : "skipped"}
        </Badge>
        <span className="text-xs text-muted-foreground">{pf.scope.timezone}</span>
      </div>
      <p className="text-xs text-muted-foreground">Kickoff: {pf.kickoff.reason}</p>
      <p className="text-xs text-muted-foreground">
        Platforms: {pf.platforms.length ? pf.platforms.join(", ") : "none connected"}
      </p>
      <div className="font-medium">
        Expected: {pf.expected.campaigns} campaign(s) · {pf.expected.posts} post(s) · {pf.expected.assets} asset(s)
      </div>
      <div className="space-y-2">
        {pf.items.length === 0 && <p className="text-muted-foreground">No events in range.</p>}
        {pf.items.map((it) => (
          <div key={`${it.kind}:${it.id}`} className="rounded border bg-background p-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{it.kind}</Badge>
              <span className="font-medium">{it.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(it.date).toLocaleString()}</span>
            </div>
            <ul className="mt-1 space-y-0.5 text-xs">
              {it.beats.map((b) => (
                <li key={b.beat} className={b.action === "create" ? "" : "text-muted-foreground"}>
                  <span className="font-mono">{b.action === "create" ? "✓" : "–"}</span>{" "}
                  <span className="font-medium">{b.beat}</span>
                  {b.scheduled_at ? ` · ${new Date(b.scheduled_at).toLocaleString()}` : ""}
                  {` · ${b.reason}`}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
