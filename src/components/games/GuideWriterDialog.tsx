import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, BookOpen, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Mode = "generate" | "enrich" | "section";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string | null;
  gameName: string;
  existingGuide: string;
  onApply: (markdown: string) => void;
}

const SECTION_PRESETS = [
  "Overview",
  "Getting Started",
  "Controls",
  "Tips & Strategy",
  "Common Pitfalls",
  "Advanced",
  "Custom…",
];

const GuideWriterDialog = ({ open, onOpenChange, gameId, gameName, existingGuide, onApply }: Props) => {
  const [mode, setMode] = useState<Mode>("enrich");
  const [sectionPreset, setSectionPreset] = useState("Tips & Strategy");
  const [customSection, setCustomSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const [meta, setMeta] = useState<{ linked: boolean; sources: number } | null>(null);

  const reset = () => {
    setPreview("");
    setMeta(null);
  };

  const handleGenerate = async () => {
    if (!gameId) {
      toast({
        title: "Save the game first",
        description: "The writer needs the game to exist so it can find the linked notebook.",
        variant: "destructive",
      });
      return;
    }
    const section = mode === "section" ? (sectionPreset === "Custom…" ? customSection.trim() : sectionPreset) : undefined;
    if (mode === "section" && !section) {
      toast({ title: "Pick a section", variant: "destructive" });
      return;
    }
    setLoading(true);
    setPreview("");
    setMeta(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-game-guide", {
        body: { game_id: gameId, mode, section, existing_guide: existingGuide },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreview((data as any).markdown ?? "");
      setMeta({
        linked: !!(data as any).notebook_linked,
        sources: (data as any).notebook_source_count ?? 0,
      });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview.trim()) return;
    onApply(preview);
    toast({ title: "Guide applied", description: "Don't forget to click Save Changes." });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-primary" />
            Guide Writer — {gameName || "Game"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generate">Generate from scratch</SelectItem>
                  <SelectItem value="enrich">Enrich existing draft</SelectItem>
                  <SelectItem value="section">Rewrite a section</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "section" && (
              <>
                <div>
                  <Label>Section</Label>
                  <Select value={sectionPreset} onValueChange={setSectionPreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTION_PRESETS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sectionPreset === "Custom…" && (
                  <div>
                    <Label>Custom section name</Label>
                    <Input
                      value={customSection}
                      onChange={(e) => setCustomSection(e.target.value)}
                      placeholder="e.g. Map Callouts"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Sources: the game's linked Open Notebook + the existing draft below.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading || !gameId} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Writing…" : preview ? "Regenerate" : "Generate preview"}
            </Button>
            {!gameId && (
              <span className="text-xs text-muted-foreground self-center flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Save the game first to enable
              </span>
            )}
          </div>

          {meta && (
            <div className="text-xs text-muted-foreground">
              {meta.linked
                ? `Notebook linked · ${meta.sources} source snippet${meta.sources === 1 ? "" : "s"} used`
                : "No notebook linked for this game — generated from existing draft + general knowledge."}
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Tabs defaultValue="rendered" className="w-full">
                <TabsList>
                  <TabsTrigger value="rendered">Rendered</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                </TabsList>
                <TabsContent value="rendered">
                  <div className="rounded-md border border-border bg-background/40 p-4 max-h-[60vh] overflow-y-auto">
                    <div className="prose prose-invert max-w-none font-heading text-sm text-muted-foreground leading-relaxed [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:tracking-wider [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-wider [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-wider [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-2 [&_strong]:text-foreground [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                      <ReactMarkdown>{preview}</ReactMarkdown>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is how the guide will appear to players. Switch to the Markdown tab to edit.
                  </p>
                </TabsContent>
                <TabsContent value="markdown">
                  <Textarea
                    value={preview}
                    onChange={(e) => setPreview(e.target.value)}
                    rows={18}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Edit the Markdown source. Applying replaces the User Guide field; you still need to click <strong>Save Changes</strong>.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={!preview.trim()}>Apply to User Guide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GuideWriterDialog;
