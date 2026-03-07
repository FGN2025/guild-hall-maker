import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, RotateCcw, Loader2, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

const AdminSeasons = () => {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [filterGameId, setFilterGameId] = useState<string>("all");

  const { data: games = [] } = useQuery({
    queryKey: ["admin-games-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ["admin-seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const gameMap = new Map(games.map((g: any) => [g.id, g.name]));

  const filteredSeasons = filterGameId === "all"
    ? seasons
    : filterGameId === "global"
      ? seasons.filter((s: any) => !s.game_id)
      : seasons.filter((s: any) => s.game_id === filterGameId);

  const createSeason = useMutation({
    mutationFn: async () => {
      if (!selectedGameId) throw new Error("Please select a game");
      const { error } = await supabase.from("seasons").insert({
        name,
        start_date: startDate,
        end_date: endDate,
        status: "upcoming",
        game_id: selectedGameId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seasons"] });
      toast.success("Season created.");
      setCreateOpen(false);
      setName("");
      setStartDate("");
      setEndDate("");
      setSelectedGameId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [rotating, setRotating] = useState(false);
  const handleRotate = async () => {
    setRotating(true);
    try {
      const { error } = await supabase.functions.invoke("rotate-season");
      if (error) throw error;
      toast.success("Season rotation triggered.");
      queryClient.invalidateQueries({ queryKey: ["admin-seasons"] });
    } catch (err: any) {
      toast.error(err.message || "Rotation failed.");
    }
    setRotating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Seasons</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage competitive seasons per game.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRotate} disabled={rotating}>
            {rotating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Rotate Seasons
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Season
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Create Season</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="font-heading">Game *</Label>
                  <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a game..." />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-heading">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Season 2 — Fortnite" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-heading">Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading">End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createSeason.mutate()}
                  disabled={!name || !startDate || !endDate || !selectedGameId || createSeason.isPending}
                >
                  {createSeason.isPending ? "Creating..." : "Create Season"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter by game */}
      <div className="flex items-center gap-3">
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
        <Select value={filterGameId} onValueChange={setFilterGameId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            <SelectItem value="global">Global (Legacy)</SelectItem>
            {games.map((g: any) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredSeasons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4" />
          <p>No seasons yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSeasons.map((s: any) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="font-heading text-base">{s.name}</CardTitle>
                  {s.game_id && gameMap.has(s.game_id) ? (
                    <Badge variant="outline" className="text-xs">
                      <Gamepad2 className="h-3 w-3 mr-1" />
                      {gameMap.get(s.game_id)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Global</Badge>
                  )}
                </div>
                <Badge
                  variant={s.status === "active" ? "default" : s.status === "completed" ? "secondary" : "outline"}
                >
                  {s.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {new Date(s.start_date).toLocaleDateString()} — {new Date(s.end_date).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSeasons;
