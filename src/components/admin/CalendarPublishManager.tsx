import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Calendar, Copy, Loader2, Save, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCalendarPublishConfigs,
  useUpsertCalendarConfig,
  useDeleteCalendarConfig,
  CalendarPublishConfig,
} from "@/hooks/useCalendarPublish";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";

interface Props {
  tenantId?: string | null;
}

const BASE_URL = window.location.origin;

const CalendarPublishManager = ({ tenantId }: Props) => {
  const { user } = useAuth();
  const { data: configs, isLoading } = useCalendarPublishConfigs(tenantId);
  const upsert = useUpsertCalendarConfig();
  const deleteMut = useDeleteCalendarConfig();

  const [editing, setEditing] = useState<Partial<CalendarPublishConfig> | null>(null);
  const [logoPicker, setLogoPicker] = useState(false);
  const [bgPicker, setBgPicker] = useState(false);

  const startNew = () => {
    setEditing({
      tenant_id: tenantId ?? null,
      title: "Tournament Calendar",
      logo_url: null,
      bg_image_url: null,
      primary_color: "#6366f1",
      accent_color: "",
      show_platform_tournaments: !tenantId,
      is_active: true,
    });
  };

  const handleSave = () => {
    if (!editing || !user) return;
    upsert.mutate(
      { ...editing, created_by: user.id } as any,
      { onSuccess: () => setEditing(null) }
    );
  };

  const copyEmbed = (id: string) => {
    const snippet = `<iframe src="${BASE_URL}/embed/calendar/${id}" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;
    navigator.clipboard.writeText(snippet);
    toast({ title: "Copied", description: "Embed snippet copied to clipboard." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Publish Calendar</h3>
        </div>
        {!editing && (
          <Button size="sm" onClick={startNew} className="font-heading">
            <Plus className="h-4 w-4 mr-1" /> New Calendar
          </Button>
        )}
      </div>

      {/* Existing configs */}
      {(configs ?? []).map((c) => (
        <Card key={c.id} className="border-border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-heading">{c.title}</CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => copyEmbed(c.id)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMut.mutate(c.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground break-all">
              {`${BASE_URL}/embed/calendar/${c.id}`}
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Editor form */}
      {editing && (
        <Card className="border-primary/30">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-heading">Title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p!, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-heading">Logo URL</Label>
                <div className="flex gap-1">
                  <Input
                    value={editing.logo_url ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p!, logo_url: e.target.value }))}
                    placeholder="https://..."
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => setLogoPicker(true)}>
                    Pick
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-heading">Background Image URL</Label>
                <div className="flex gap-1">
                  <Input
                    value={editing.bg_image_url ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p!, bg_image_url: e.target.value }))}
                    placeholder="https://..."
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => setBgPicker(true)}>
                    Pick
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-heading">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={editing.primary_color || "#6366f1"}
                    onChange={(e) => setEditing((p) => ({ ...p!, primary_color: e.target.value }))}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={editing.primary_color ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p!, primary_color: e.target.value }))}
                    className="text-xs flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-heading">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={editing.accent_color || "#6366f1"}
                    onChange={(e) => setEditing((p) => ({ ...p!, accent_color: e.target.value }))}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={editing.accent_color ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p!, accent_color: e.target.value }))}
                    className="text-xs flex-1"
                  />
                </div>
              </div>
            </div>

            {!tenantId && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.show_platform_tournaments ?? true}
                  onCheckedChange={(v) => setEditing((p) => ({ ...p!, show_platform_tournaments: v }))}
                />
                <Label className="text-xs">Show platform tournaments</Label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p!, is_active: v }))}
              />
              <Label className="text-xs">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={upsert.isPending} className="font-heading">
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {editing.id ? "Update" : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="font-heading">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media pickers */}
      <MediaPickerDialog
        open={logoPicker}
        onOpenChange={setLogoPicker}
        onSelect={(url) => {
          setEditing((p) => ({ ...p!, logo_url: url }));
          setLogoPicker(false);
        }}
      />
      <MediaPickerDialog
        open={bgPicker}
        onOpenChange={setBgPicker}
        onSelect={(url) => {
          setEditing((p) => ({ ...p!, bg_image_url: url }));
          setBgPicker(false);
        }}
      />
    </div>
  );
};

export default CalendarPublishManager;
