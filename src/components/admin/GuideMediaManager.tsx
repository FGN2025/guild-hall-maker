import { useState } from "react";
import { useGuideMedia, GuideMediaItem } from "@/hooks/useGuideMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Trash2, Upload, Loader2, Image, Video, FileText } from "lucide-react";

const GUIDE_CONFIGS: { slug: string; label: string; sections: { id: string; label: string }[] }[] = [
  {
    slug: "tournaments",
    label: "Tournament Guide",
    sections: [
      { id: "overview", label: "What Are Tournaments?" },
      { id: "finding", label: "Finding & Filtering" },
      { id: "registration", label: "Registration" },
      { id: "tournament-day", label: "Tournament Day" },
      { id: "brackets", label: "Brackets & Matches" },
      { id: "points-prizes", label: "Points & Prizes" },
      { id: "multi-date", label: "Multi-Date Events" },
      { id: "creating", label: "Creating Tournaments" },
      { id: "tips", label: "Tips & FAQ" },
    ],
  },
  {
    slug: "challenges",
    label: "Challenge Guide",
    sections: [
      { id: "what-are-challenges", label: "What Are Challenges?" },
      { id: "types-difficulty", label: "Types & Difficulty" },
      { id: "enrolling", label: "Enrolling" },
      { id: "task-checklists", label: "Task Checklists" },
      { id: "evidence-upload", label: "Evidence Upload" },
      { id: "review-process", label: "Review Process" },
      { id: "points-rewards", label: "Points & Rewards" },
      { id: "notifications", label: "Notifications" },
      { id: "tips-faq", label: "Tips & FAQ" },
    ],
  },
  {
    slug: "quests",
    label: "Quest Guide",
    sections: [
      { id: "what-are-quests", label: "What Are Quests?" },
      { id: "enrolling", label: "Enrolling" },
      { id: "tasks-evidence", label: "Tasks & Evidence" },
      { id: "per-task-points", label: "Per-Task Point Payouts" },
      { id: "quest-chains", label: "Quest Chains" },
      { id: "xp-ranks", label: "XP & Rank System" },
      { id: "story-narratives", label: "Story Narratives" },
      { id: "tips-faq", label: "Tips & FAQ" },
    ],
  },
];

function GuideMediaTab({ config }: { config: typeof GUIDE_CONFIGS[number] }) {
  const { media, uploadMedia, deleteMedia, isUploading } = useGuideMedia(config.slug);
  const [sectionId, setSectionId] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file || !sectionId) {
      toast({ title: "Select a section and file", variant: "destructive" });
      return;
    }
    const fileType = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "file";
    try {
      await uploadMedia({ file, sectionId, caption, fileType });
      toast({ title: "Media uploaded" });
      setFile(null);
      setCaption("");
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (item: GuideMediaItem) => {
    try {
      await deleteMedia(item.id);
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const typeIcon = (t: string) => {
    if (t === "video") return <Video className="h-4 w-4" />;
    if (t === "image") return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/30">
        <div className="space-y-2">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="Pick section…" /></SelectTrigger>
            <SelectContent>
              {config.sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Caption (optional)</Label>
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Describe the media…" />
        </div>
        <div className="space-y-2">
          <Label>File</Label>
          <Input type="file" accept="image/*,video/*,.pdf,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleUpload} disabled={isUploading || !file || !sectionId} className="gap-2">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No media uploaded yet for this guide.</p>
      ) : (
        <div className="space-y-2">
          {media.map((item) => {
            const sectionLabel = config.sections.find((s) => s.id === item.section_id)?.label || item.section_id;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 border border-border rounded-md bg-card">
                {typeIcon(item.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.caption || item.file_url.split("/").pop()}</p>
                  <p className="text-xs text-muted-foreground">Section: {sectionLabel}</p>
                </div>
                {item.file_type === "image" && (
                  <img src={item.file_url} alt="" className="h-10 w-10 rounded object-cover border border-border" />
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const GuideMediaManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          Player Guide Media
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tournaments">
          <TabsList className="mb-4">
            {GUIDE_CONFIGS.map((c) => (
              <TabsTrigger key={c.slug} value={c.slug}>{c.label}</TabsTrigger>
            ))}
          </TabsList>
          {GUIDE_CONFIGS.map((c) => (
            <TabsContent key={c.slug} value={c.slug}>
              <GuideMediaTab config={c} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GuideMediaManager;
