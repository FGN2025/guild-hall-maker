import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { PlugZap, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Check {
  id: string;
  label: string;
  expected: string;
  status: number | null;
  passed: boolean;
  detail: string;
}

interface TestResult {
  checked_at: string;
  key_configured: boolean;
  status: "healthy" | "error";
  passed?: number;
  total?: number;
  checks: Check[];
  message?: string;
}

const EcosystemConnectionTest = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke<TestResult>(
        "ecosystem-connection-test",
        { body: {} },
      );
      if (error) throw error;
      setResult(data ?? null);
      if (data?.status === "healthy") {
        toast({ title: "Connection test passed", description: `${data.passed}/${data.total} checks succeeded.` });
      } else {
        toast({
          title: "Connection test found problems",
          description: data?.message ?? "One or more checks failed.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Could not run the test",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" />
          <Label className="font-heading text-sm">Ecosystem API Connection Test</Label>
          {result && (
            <Badge
              className={
                result.status === "healthy"
                  ? "gap-1 bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "gap-1"
              }
              variant={result.status === "healthy" ? undefined : "destructive"}
            >
              {result.status === "healthy" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {result.passed ?? 0}/{result.total ?? 0} passed
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={runTest} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          <span className="ml-2">{running ? "Testing…" : "Test connection"}</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Runs live checks against the shared data API and the merit connector using the stored ecosystem key. The key itself is never shown.
      </p>

      {result && !result.key_configured && (
        <p className="text-sm text-destructive">{result.message}</p>
      )}

      {result?.checks?.length ? (
        <div className="space-y-2">
          {result.checks.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-3 text-sm"
            >
              {c.passed ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground break-words">
                  Expected {c.expected} · got {c.status ?? "no response"}
                  {c.detail ? ` · ${c.detail}` : ""}
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Last run {new Date(result.checked_at).toLocaleString()}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default EcosystemConnectionTest;
