import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Cpu, CheckCircle2, XCircle, Loader2, Copy, ChevronDown,
  ArrowLeft, ExternalLink, Sparkles,
} from "lucide-react";
import { CDL_DOMAINS, ATS_GAME_ID, computePointsBreakdown, buildCoverImagePrompt, REFERENCE_TYPE_LABELS, type ReferenceType } from "@/lib/cdlDomainMaps";

type ValidationResult = { passed: number; total: number; failures: string[] };

interface GeneratedChallenge {
  challenge: Record<string, any>;
  tasks: Array<{ title: string; description: string; display_order: number }>;
  validation: ValidationResult;
  raw_response: string;
}

type PageState = "input" | "generating" | "review" | "publishing" | "published";

const ModeratorCDLGenerate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminContext = window.location.pathname.startsWith("/admin");
  const backPath = isAdminContext ? "/admin/challenges" : "/moderator/challenges";

  // Input form state
  const [domain, setDomain] = useState("");
  const [cfrReference, setCfrReference] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [challengeType, setChallengeType] = useState("monthly");
  const [pointsReward, setPointsReward] = useState(10);
  const [estimatedMinutes, setEstimatedMinutes] = useState(50);

  // Generation state
  const [pageState, setPageState] = useState<PageState>("input");
  const [result, setResult] = useState<GeneratedChallenge | null>(null);

  // Editable review fields
  const [editChallenge, setEditChallenge] = useState<Record<string, any>>({});
  const [editTasks, setEditTasks] = useState<Array<{ title: string; description: string; display_order: number }>>([]);

  // Published result
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const handleDomainChange = (value: string) => {
    setDomain(value);
    const config = CDL_DOMAINS[value];
    if (config) {
      setCfrReference(config.cfrReference);
      setChallengeType(config.challengeType);
      setPointsReward(config.defaultPoints);
      setEstimatedMinutes(config.defaultMinutes);
    }
  };

  const handleGenerate = async () => {
    if (!domain || !user) return;
    setPageState("generating");

    try {
      const config = CDL_DOMAINS[domain];
      const seasonId = challengeType === "monthly" ? "a4c1209d-0bff-4fce-8437-dbbde3a67db2" : null;

      const { data, error } = await supabase.functions.invoke("generate-cdl-challenge", {
        body: {
          cdl_domain: domain,
          cfr_reference: cfrReference,
          difficulty,
          challenge_type: challengeType,
          game_id: ATS_GAME_ID,
          season_id: seasonId,
          estimated_minutes: estimatedMinutes,
          points_reward: pointsReward,
          created_by: user.id,
          alignment_strength: config?.alignment ?? "STRONG",
        },
      });

      if (error) throw error;

      setResult(data);
      setEditChallenge(data.challenge || {});
      setEditTasks(data.tasks || []);
      setPageState("review");
    } catch (err: any) {
      console.error("Generation error:", err);
      toast.error(`Generation failed: ${err.message}`);
      setPageState("input");
    }
  };

  const handlePublish = async () => {
    if (!user || !result) return;
    setPageState("publishing");

    try {
      const config = CDL_DOMAINS[domain];
      const seasonId = challengeType === "monthly" ? "a4c1209d-0bff-4fce-8437-dbbde3a67db2" : null;
      const points = computePointsBreakdown(editChallenge.points_reward || pointsReward);

      const challengePayload = {
        ...editChallenge,
        ...points,
        game_id: ATS_GAME_ID,
        season_id: seasonId,
        requires_evidence: true,
        cdl_domain: domain,
        cfr_reference: cfrReference,
      };

      const { data, error } = await supabase.functions.invoke("publish-cdl-challenge", {
        body: {
          challenge: challengePayload,
          tasks: editTasks,
          created_by: user.id,
        },
      });

      if (error) throw error;

      setPublishedId(data.challenge_id);
      setPageState("published");
      toast.success(`Challenge created — ID ${data.challenge_id}`);
    } catch (err: any) {
      console.error("Publish error:", err);
      toast.error(`Publish failed: ${err.message}`);
      setPageState("review");
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setEditChallenge({});
    setEditTasks([]);
    setPageState("input");
  };

  const updateChallengeField = (field: string, value: any) => {
    setEditChallenge((prev) => ({ ...prev, [field]: value }));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setEditTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const validation = result?.validation;
  const allPassed = validation && validation.passed === validation.total;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-6 w-6 text-primary" />
              Generate CDL Trade Skills Challenge
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Powered by FGN Trucking Coach + CDL Skills Development notebooks
            </p>
          </div>
        </div>

        {/* ════════ INPUT FORM ════════ */}
        {(pageState === "input" || pageState === "generating") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Challenge Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Domain */}
              <div className="space-y-2">
                <Label>CDL Domain *</Label>
                <Select value={domain} onValueChange={handleDomainChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CDL domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CDL_DOMAINS).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CFR Reference */}
              <div className="space-y-2">
                <Label>CFR Reference</Label>
                <Input value={cfrReference} onChange={(e) => setCfrReference(e.target.value)} placeholder="49 CFR ..." />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="flex gap-3">
                  {["beginner", "intermediate", "advanced"].map((d) => (
                    <Button
                      key={d}
                      variant={difficulty === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className="capitalize"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Challenge Type */}
              <div className="space-y-2">
                <Label>Challenge Type</Label>
                <Select value={challengeType} onValueChange={setChallengeType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Points & Minutes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Points Reward</Label>
                  <Input type="number" value={pointsReward} onChange={(e) => setPointsReward(Number(e.target.value))} min={1} />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Minutes</Label>
                  <Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} min={1} />
                </div>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={!domain || pageState === "generating"}
                className="w-full gap-2"
                size="lg"
              >
                {pageState === "generating" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Querying CDL Skills Development notebook...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Challenge
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ════════ REVIEW PANEL ════════ */}
        {(pageState === "review" || pageState === "publishing") && result && (
          <div className="space-y-4">
            {/* Validation Badge */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  {allPassed ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-sm px-3 py-1">
                      <CheckCircle2 className="h-4 w-4" />
                      {validation!.passed}/{validation!.total} All Pass
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 text-sm px-3 py-1">
                      <XCircle className="h-4 w-4" />
                      {validation!.passed}/{validation!.total} — {validation!.failures.length} issues
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">18-Point Validation Benchmark</span>
                </div>
                {!allPassed && validation!.failures.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {validation!.failures.map((f, i) => (
                      <li key={i} className="text-sm text-destructive flex items-center gap-2">
                        <XCircle className="h-3 w-3 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Challenge Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Challenge Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editChallenge.name || ""} onChange={(e) => updateChallengeField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description (Markdown)</Label>
                  <Textarea
                    value={editChallenge.description || ""}
                    onChange={(e) => updateChallengeField("description", e.target.value)}
                    rows={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certification Description</Label>
                  <Textarea
                    value={editChallenge.certification_description || ""}
                    onChange={(e) => updateChallengeField("certification_description", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Points Reward</Label>
                    <Input
                      type="number"
                      value={editChallenge.points_reward || ""}
                      onChange={(e) => updateChallengeField("points_reward", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Minutes</Label>
                    <Input
                      type="number"
                      value={editChallenge.estimated_minutes || ""}
                      onChange={(e) => updateChallengeField("estimated_minutes", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks ({editTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editTasks.map((task, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Task {task.display_order}</Badge>
                    </div>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(i, "title", e.target.value)}
                      placeholder="Task title"
                    />
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(i, "description", e.target.value)}
                      rows={2}
                      placeholder="Task description"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cover Image Prompt */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Cover Image Prompt</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(editChallenge.cover_image_prompt || "")}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap">
                  {editChallenge.cover_image_prompt || "No prompt generated"}
                </p>
              </CardContent>
            </Card>

            {/* Coach Context */}
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Coach Context</CardTitle>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {editChallenge.coach_context || "No coach context generated"}
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Suggested Coach Prompts */}
            {Array.isArray(editChallenge.suggested_coach_prompts) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Suggested Coach Prompts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {editChallenge.suggested_coach_prompts.map((p: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                        {i + 1}. {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handlePublish}
                disabled={!allPassed || pageState === "publishing"}
                className="flex-1 gap-2"
                size="lg"
              >
                {pageState === "publishing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Publishing...</>
                ) : (
                  "Publish Challenge"
                )}
              </Button>
              <Button variant="outline" onClick={handleDiscard} disabled={pageState === "publishing"} size="lg">
                Discard &amp; Start Over
              </Button>
            </div>
          </div>
        )}

        {/* ════════ PUBLISHED STATE ════════ */}
        {pageState === "published" && publishedId && (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Challenge Created Successfully</h2>
              <p className="text-sm text-muted-foreground">
                The challenge has been inserted as <strong>inactive</strong>. Add a cover image via Media Library and activate it when ready.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(`/challenges/${publishedId}`)} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> View Challenge
                </Button>
                <Button variant="outline" onClick={() => navigate("/moderator/challenges")}>
                  Back to Challenges
                </Button>
                <Button onClick={handleDiscard} className="gap-2">
                  <Sparkles className="h-4 w-4" /> Generate Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModeratorCDLGenerate;
