import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Plus, Package, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  approved: { color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  denied: { color: "bg-destructive/20 text-destructive", icon: XCircle },
  fulfilled: { color: "bg-primary/20 text-primary", icon: Package },
};

const ModeratorRedemptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", points_cost: "", quantity_available: "" });

  // Prizes
  const { data: prizes = [], isLoading: prizesLoading } = useQuery({
    queryKey: ["mod-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prizes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Redemptions
  const { data: redemptions = [], isLoading: redemptionsLoading } = useQuery({
    queryKey: ["mod-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prize_redemptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
      const prizeIds = [...new Set((data ?? []).map((r: any) => r.prize_id))];

      const [profilesRes, prizesRes] = await Promise.all([
        userIds.length > 0 ? supabase.from("profiles").select("user_id, display_name").in("user_id", userIds) : { data: [] },
        prizeIds.length > 0 ? supabase.from("prizes").select("id, name").in("id", prizeIds) : { data: [] },
      ]);

      const nameMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p.display_name ?? "Unknown"]));
      const prizeMap = new Map((prizesRes.data ?? []).map((p: any) => [p.id, p.name]));

      return (data ?? []).map((r: any) => ({
        ...r,
        player_name: nameMap.get(r.user_id) ?? "Unknown",
        prize_name: prizeMap.get(r.prize_id) ?? "Unknown",
      }));
    },
  });

  const createPrizeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("prizes").insert({
        name: form.name,
        description: form.description || null,
        points_cost: parseInt(form.points_cost) || 0,
        quantity_available: form.quantity_available ? parseInt(form.quantity_available) : null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-prizes"] });
      toast.success("Prize created!");
      setCreateOpen(false);
      setForm({ name: "", description: "", points_cost: "", quantity_available: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePrizeMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("prizes").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-prizes"] });
      toast.success("Updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRedemptionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("prize_redemptions")
        .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-redemptions"] });
      toast.success("Redemption updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pendingCount = redemptions.filter((r: any) => r.status === "pending").length;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 mb-8">
        <Gift className="h-8 w-8 text-primary" />
        Prize Redemptions
        {pendingCount > 0 && (
          <Badge className="bg-yellow-500/20 text-yellow-400">{pendingCount} pending</Badge>
        )}
      </h1>

      <Tabs defaultValue="redemptions">
        <TabsList className="mb-6">
          <TabsTrigger value="redemptions">Redemption Requests</TabsTrigger>
          <TabsTrigger value="catalog">Prize Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="redemptions">
          {redemptionsLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">No redemption requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((r: any) => {
                    const config = statusConfig[r.status] || statusConfig.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.player_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.prize_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">{r.points_spent}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>{r.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="outline" className="gap-1 text-green-400 hover:text-green-300"
                                onClick={() => updateRedemptionMutation.mutate({ id: r.id, status: "approved" })}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive/80"
                                onClick={() => updateRedemptionMutation.mutate({ id: r.id, status: "denied" })}>
                                <XCircle className="h-3 w-3" /> Deny
                              </Button>
                            </div>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" variant="outline" className="gap-1"
                              onClick={() => updateRedemptionMutation.mutate({ id: r.id, status: "fulfilled" })}>
                              <Package className="h-3 w-3" /> Mark Fulfilled
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog">
          <div className="flex justify-end mb-4">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Prize</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Add Prize</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Prize name..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Prize description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Points Cost</Label>
                      <Input type="number" min={0} value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity (blank = unlimited)</Label>
                      <Input type="number" min={0} value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={() => createPrizeMutation.mutate()} disabled={createPrizeMutation.isPending || !form.name.trim()} className="w-full">
                    {createPrizeMutation.isPending ? "Adding..." : "Add Prize"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {prizesLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : prizes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-body">No prizes in catalog. Add your first prize above.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prizes.map((p: any) => (
                <Card key={p.id} className={!p.is_active ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base">{p.name}</CardTitle>
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(checked) => togglePrizeMutation.mutate({ id: p.id, is_active: checked })}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">{p.points_cost} pts</Badge>
                      <span className="text-xs text-muted-foreground">
                        {p.quantity_available != null ? `${p.quantity_available} left` : "Unlimited"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModeratorRedemptions;
