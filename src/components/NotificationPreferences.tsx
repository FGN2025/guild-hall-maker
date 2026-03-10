import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Mail, MonitorSmartphone, Volume2, VolumeX, Play } from "lucide-react";
import { useNotificationPreferences, NOTIFICATION_TYPES } from "@/hooks/useNotificationPreferences";
import {
  isSoundMuted,
  setSoundMuted,
  getSelectedSound,
  setSelectedSound,
  previewSound,
  SOUND_OPTIONS,
} from "@/lib/notificationAlerts";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

const NotificationPreferences = () => {
  const { preferences, isLoading, toggle } = useNotificationPreferences();
  const [muted, setMuted] = useState(isSoundMuted);
  const [soundChoice, setSoundChoice] = useState(getSelectedSound);

  const handleToggle = (type: string, channel: "in_app" | "email", enabled: boolean) => {
    toggle.mutate(
      { notification_type: type, channel, enabled },
      {
        onSuccess: () => toast.success("Preference updated"),
        onError: () => toast.error("Failed to update preference"),
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="glass-panel border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-2xl flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notification Preferences
        </CardTitle>
        <CardDescription className="font-body">
          Choose how you want to be notified for each event type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound toggle + picker */}
        <div className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {muted ? (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Volume2 className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-heading text-sm text-foreground">Notification Sound</p>
                <p className="text-xs text-muted-foreground font-body">
                  Play an audio chime when a new notification arrives
                </p>
              </div>
            </div>
            <Switch
              checked={!muted}
              onCheckedChange={(v) => {
                setMuted(!v);
                setSoundMuted(!v);
                toast.success(v ? "Sound enabled" : "Sound muted");
              }}
            />
          </div>

          {/* Sound picker — only interactive when not muted */}
          <div className={muted ? "opacity-40 pointer-events-none" : ""}>
            <p className="text-xs text-muted-foreground font-body mb-2">Choose a tone</p>
            <RadioGroup
              value={soundChoice}
              onValueChange={(val) => {
                setSoundChoice(val);
                setSelectedSound(val);
              }}
              className="space-y-2"
            >
              {SOUND_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={opt.key} id={`sound-${opt.key}`} />
                    <Label htmlFor={`sound-${opt.key}`} className="text-sm font-body cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => previewSound(opt.key)}
                    aria-label={`Preview ${opt.label}`}
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {NOTIFICATION_TYPES.map((nt) => {
          const pref = preferences?.[nt.key];
          return (
            <div key={nt.key} className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
              <div>
                <p className="font-heading text-sm text-foreground">{nt.label}</p>
                <p className="text-xs text-muted-foreground font-body">{nt.description}</p>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`${nt.key}-inapp`} className="text-sm font-body cursor-pointer">
                    In-App
                  </Label>
                  <Switch
                    id={`${nt.key}-inapp`}
                    checked={pref?.in_app_enabled ?? true}
                    onCheckedChange={(v) => handleToggle(nt.key, "in_app", v)}
                    disabled={toggle.isPending}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`${nt.key}-email`} className="text-sm font-body cursor-pointer">
                    Email
                  </Label>
                  <Switch
                    id={`${nt.key}-email`}
                    checked={pref?.email_enabled ?? true}
                    onCheckedChange={(v) => handleToggle(nt.key, "email", v)}
                    disabled={toggle.isPending}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
