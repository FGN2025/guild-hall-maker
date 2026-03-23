import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Save, Upload, Trash2, FileText, Image, Loader2 } from "lucide-react";
import { useCoachProfile } from "@/hooks/useCoachProfile";

export default function CoachProfileCard() {
  const { profile, files, loading, saving, uploading, saveProfile, uploadFile, deleteFile } = useCoachProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [statsSummary, setStatsSummary] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setEnabled(profile.enabled);
      setNotes(profile.notes ?? "");
      setStatsSummary(profile.stats_summary ?? "");
    }
  }, [profile]);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    await saveProfile({ enabled: checked });
  };

  const handleSave = async () => {
    await saveProfile({ notes: notes.trim() || null, stats_summary: statsSummary.trim() || null });
    setDirty(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <Card className="glass-panel border-border/50 mt-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-border/50 mt-6">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          AI Coach Profile
        </CardTitle>
        <CardDescription className="font-body">
          Share your stats and goals so the AI Coach can give you personalized advice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="coach-personalization" className="font-heading text-sm text-foreground">
            Enable personalized coaching
          </Label>
          <Switch
            id="coach-personalization"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {enabled && (
          <>
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="coach-notes" className="font-heading text-sm text-foreground">
                Notes & Goals
              </Label>
              <Textarea
                id="coach-notes"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                placeholder="e.g. I main Jett in Valorant, struggling with post-plant situations. Goal: reach Diamond by end of season."
                className="bg-card border-border font-body min-h-[80px]"
                maxLength={2000}
              />
            </div>

            {/* Stats Summary */}
            <div className="space-y-2">
              <Label htmlFor="coach-stats" className="font-heading text-sm text-foreground">
                Stats Summary
              </Label>
              <Textarea
                id="coach-stats"
                value={statsSummary}
                onChange={(e) => { setStatsSummary(e.target.value); setDirty(true); }}
                placeholder="e.g. Win rate: 52%, K/D: 1.3, Current rank: Platinum 2, Most played agents: Jett, Omen"
                className="bg-card border-border font-body min-h-[80px]"
                maxLength={2000}
              />
            </div>

            {/* Save */}
            {dirty && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full font-heading tracking-wide gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            )}

            {/* File Upload */}
            <div className="space-y-3">
              <Label className="font-heading text-sm text-foreground">
                Uploaded Files ({files.length}/5)
              </Label>
              <p className="text-xs text-muted-foreground font-body">
                Upload stat screenshots, CSVs, or PDFs for the coach to reference.
              </p>

              {files.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2 font-heading text-xs"
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.csv,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        {f.file_type.startsWith("image/") ? (
                          <Image className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-body text-foreground truncate">{f.file_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteFile(f.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
