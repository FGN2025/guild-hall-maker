import { useState } from "react";
import { useAgentPrompts } from "@/hooks/useAgentPrompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminAgentPrompts() {
  const { data: versions = [], isLoading, createVersion, activate } = useAgentPrompts("marketing_agent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const selected = versions.find((v) => v.id === selectedId) ?? versions.find((v) => v.active) ?? versions[0];

  const beginEdit = () => {
    if (selected) setDraft(selected.content);
  };

  const saveNewVersion = async () => {
    try {
      const row = await createVersion.mutateAsync(draft);
      setSelectedId(row.id);
      setDraft("");
      toast({ title: "New version saved", description: `v${row.version} created (inactive).` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const activateSelected = async () => {
    if (!selected) return;
    try {
      await activate.mutateAsync(selected.id);
      toast({ title: "Activated", description: `v${selected.version} is now the active prompt.` });
    } catch (e: any) {
      toast({ title: "Activate failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Agent Prompts</h1>
        <p className="text-muted-foreground text-sm">Platform-admin only. Active prompt is loaded by <code>agent-run</code>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Versions</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => { setSelectedId(v.id); setDraft(""); }}
                className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center justify-between ${
                  selected?.id === v.id ? "bg-muted font-medium" : ""
                }`}
              >
                <span>v{v.version}</span>
                {v.active && <Badge variant="default" className="text-xs">active</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {selected ? `marketing_agent v${selected.version}` : "No prompt"}
              {selected?.active && <Badge className="ml-2">active</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              {!draft && selected && (
                <Button size="sm" variant="outline" onClick={beginEdit}>Edit as new version</Button>
              )}
              {draft && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setDraft("")}>Cancel</Button>
                  <Button size="sm" onClick={saveNewVersion} disabled={createVersion.isPending || draft.trim().length < 20}>
                    Save new version
                  </Button>
                </>
              )}
              {selected && !selected.active && !draft && (
                <Button size="sm" onClick={activateSelected} disabled={activate.isPending}>
                  Activate this version
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {draft ? (
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs min-h-[520px]" />
            ) : selected ? (
              <ScrollArea className="h-[520px] rounded border p-3 bg-muted/30">
                <pre className="whitespace-pre-wrap text-xs">{selected.content}</pre>
              </ScrollArea>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
