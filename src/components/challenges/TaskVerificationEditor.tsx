import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gamepad2, Search } from "lucide-react";
import { toast } from "sonner";

export type VerificationType = "manual" | "steam_achievement" | "steam_playtime";

interface SteamAchievement {
  api_name: string;
  display_name: string;
  description: string | null;
}

interface Props {
  steamAppId: string | null | undefined;
  verificationType: VerificationType;
  steamAchievementApiName: string | null;
  steamPlaytimeMinutes: number | null;
  onChange: (next: {
    verification_type: VerificationType;
    steam_achievement_api_name: string | null;
    steam_playtime_minutes: number | null;
  }) => void;
}

const TaskVerificationEditor = ({
  steamAppId,
  verificationType,
  steamAchievementApiName,
  steamPlaytimeMinutes,
  onChange,
}: Props) => {
  const [schemaQuery, setSchemaQuery] = useState("");
  const hasSteam = !!steamAppId;

  const { data: achievements, isFetching, refetch } = useQuery({
    queryKey: ["steam-game-schema", steamAppId],
    enabled: false, // load on demand
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `steam-game-schema?appid=${encodeURIComponent(steamAppId!)}`,
        { method: "GET" }
      );
      if (error) throw error;
      return (data?.achievements ?? []) as SteamAchievement[];
    },
  });

  const filtered = (achievements ?? []).filter((a) => {
    if (!schemaQuery.trim()) return true;
    const q = schemaQuery.toLowerCase();
    return (
      a.display_name?.toLowerCase().includes(q) ||
      a.api_name.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  });

  const handleTypeChange = (v: string) => {
    const next = v as VerificationType;
    onChange({
      verification_type: next,
      steam_achievement_api_name: next === "steam_achievement" ? steamAchievementApiName : null,
      steam_playtime_minutes: next === "steam_playtime" ? steamPlaytimeMinutes : null,
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Verification
        </Label>
        {!hasSteam && (
          <span className="text-[10px] text-muted-foreground italic">
            Add a Steam App ID to the game to enable auto-verification
          </span>
        )}
      </div>
      <Select
        value={verificationType}
        onValueChange={handleTypeChange}
        disabled={!hasSteam && verificationType === "manual"}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manual upload (screenshot/video)</SelectItem>
          <SelectItem value="steam_achievement" disabled={!hasSteam}>
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="h-3 w-3" /> Steam achievement
            </span>
          </SelectItem>
          <SelectItem value="steam_playtime" disabled={!hasSteam}>
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="h-3 w-3" /> Steam playtime threshold
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {verificationType === "steam_achievement" && hasSteam && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              value={schemaQuery}
              onChange={(e) => setSchemaQuery(e.target.value)}
              placeholder="Filter achievements..."
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => refetch().catch((e: any) => toast.error(e.message))}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              {achievements ? "Refresh" : "Load list"}
            </Button>
          </div>
          {achievements && (
            <Select
              value={steamAchievementApiName ?? ""}
              onValueChange={(v) =>
                onChange({
                  verification_type: "steam_achievement",
                  steam_achievement_api_name: v,
                  steam_playtime_minutes: null,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select an achievement..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {filtered.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No matches</div>
                )}
                {filtered.map((a) => (
                  <SelectItem key={a.api_name} value={a.api_name}>
                    <div className="flex flex-col text-xs">
                      <span className="font-medium">{a.display_name || a.api_name}</span>
                      <span className="text-[10px] text-muted-foreground">{a.api_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!achievements && steamAchievementApiName && (
            <Input
              value={steamAchievementApiName}
              onChange={(e) =>
                onChange({
                  verification_type: "steam_achievement",
                  steam_achievement_api_name: e.target.value,
                  steam_playtime_minutes: null,
                })
              }
              placeholder="Achievement API name"
              className="h-8 text-xs"
            />
          )}
        </div>
      )}

      {verificationType === "steam_playtime" && hasSteam && (
        <div className="space-y-1">
          <Label className="text-xs">Required playtime (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={steamPlaytimeMinutes ?? ""}
            onChange={(e) =>
              onChange({
                verification_type: "steam_playtime",
                steam_achievement_api_name: null,
                steam_playtime_minutes: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="e.g. 60"
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
};

export default TaskVerificationEditor;
