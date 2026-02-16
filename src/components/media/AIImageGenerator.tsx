import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface Props {
  onGenerate: (data: { prompt: string; category?: string; tags?: string[] }) => Promise<any>;
  isGenerating: boolean;
}

const CATEGORIES = ["general", "games", "tournament", "badge", "trophy", "banner"];

const AIImageGenerator = ({ onGenerate, isGenerating }: Props) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("general");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await onGenerate({ prompt: prompt.trim(), category });
    setPrompt("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-heading gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Sparkles className="h-4 w-4" /> AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Generate Image with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="font-heading text-sm">Prompt *</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-card border-border font-body min-h-[100px]"
              placeholder="e.g. Epic cyberpunk Street Fighter 6 tournament banner with neon lights"
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-heading text-sm">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card border-border font-body">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full font-heading tracking-wide bg-accent text-accent-foreground hover:bg-accent/90 py-5"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" />
                Generating...
              </span>
            ) : (
              "Generate Image"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIImageGenerator;
