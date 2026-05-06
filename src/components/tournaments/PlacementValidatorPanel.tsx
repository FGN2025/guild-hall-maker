import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award } from "lucide-react";

interface Props {
  tournamentId: string;
  game?: string | null;
}

interface PlayerOpt {
  user_id: string;
  display_name: string;
}

const places = [
  { place: 1 as const, label: "1st Place", icon: Trophy, color: "text-yellow-500" },
  { place: 2 as const, label: "2nd Place", icon: Medal, color: "text-zinc-300" },
  { place: 3 as const, label: "3rd Place", icon: Award, color: "text-amber-700" },
];

const PlacementValidatorPanel = ({ tournamentId, game }: Props) => {
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<Record<number, string>>({});

  const { data: tournament } = useQuery({
    queryKey: ["placement-tournament", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("points_first, points_second, points_third, format")
        .eq("id", tournamentId)
        .maybeSingle();
      return data;
    },
  });

  const { data: players = [] } = useQuery<PlayerOpt[]>({
    queryKey: ["placement-players", tournamentId],
    queryFn: async () => {
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select("user_id")
        .eq("tournament_id", tournamentId);
      const ids = (regs ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      return (profs ?? []) as PlayerOpt[];
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["tournament-placements", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournament_placements")
        .select("place, user_id, points_awarded")
        .eq("tournament_id", tournamentId)
        .order("place");
      return data ?? [];
    },
  });

  // Auto-suggest from bracket (single-elim only) via dry-run
  useEffect(() => {
    if (existing.length > 0 || !tournament) return;
    if (!(tournament.format ?? "").toLowerCase().includes("single")) return;
    (async () => {
      const { data } = await supabase.functions.invoke("award-tournament-placements", {
        body: { tournament_id: tournamentId, dry_run: true },
      });
      if (data?.success && Array.isArray(data.placements)) {
        const next: Record<number, string> = {};
        for (const p of data.placements) if (p.user_id) next[p.place] = p.user_id;
        setSelections((s) => ({ ...next, ...s }));
      }
    })();
  }, [tournament, existing.length, tournamentId]);

  const awardMutation = useMutation({
    mutationFn: async () => {
      const body: any = { tournament_id: tournamentId };
      if (selections[1]) body.first_id = selections[1];
      if (selections[2]) body.second_id = selections[2];
      if (selections[3]) body.third_id = selections[3];
      const { data, error } = await supabase.functions.invoke("award-tournament-placements", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      const n = (data?.awarded ?? []).length;
      const skipped = (data?.skipped ?? []).length;
      toast.success(`Awarded ${n} placement${n === 1 ? "" : "s"}${skipped ? ` (${skipped} already awarded)` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["tournament-placements", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to award placements"),
  });

  const pointsByPlace: Record<number, number> = {
    1: tournament?.points_first ?? 10,
    2: tournament?.points_second ?? 5,
    3: tournament?.points_third ?? 3,
  };

  const existingByPlace = new Map(existing.map((e: any) => [e.place, e]));
  const allAwarded = existing.length === 3;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold text-foreground">Placement Points</h4>
        {allAwarded && <span className="text-xs text-success">All awarded ✓</span>}
      </div>
      <div className="space-y-2">
        {places.map(({ place, label, icon: Icon, color }) => {
          const ex = existingByPlace.get(place);
          const selectedId = ex?.user_id ?? selections[place] ?? "";
          const playerName = players.find((p) => p.user_id === selectedId)?.display_name;
          return (
            <div key={place} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm font-medium w-20">{label}</span>
              <span className="text-xs text-muted-foreground w-16">+{pointsByPlace[place]} pts</span>
              {ex ? (
                <span className="text-sm text-muted-foreground flex-1">
                  {playerName ?? selectedId.slice(0, 8)} · awarded
                </span>
              ) : (
                <Select value={selectedId} onValueChange={(v) => setSelections((s) => ({ ...s, [place]: v }))}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
      <Button
        onClick={() => awardMutation.mutate()}
        disabled={allAwarded || awardMutation.isPending || !selections[1]}
        className="w-full"
        size="sm"
      >
        {awardMutation.isPending ? "Awarding…" : allAwarded ? "Placements Complete" : "Award Placement Points"}
      </Button>
    </div>
  );
};

export default PlacementValidatorPanel;
