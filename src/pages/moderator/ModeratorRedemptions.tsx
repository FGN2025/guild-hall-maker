import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Plus, Package, CheckCircle, XCircle, Clock, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PrizeFormDialog, { type PrizeFormValues } from "@/components/moderator/PrizeFormDialog";

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  approved: { color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  denied: { color: "bg-destructive/20 text-destructive", icon: XCircle },
  fulfilled: { color: "bg-primary/20 text-primary", icon: Package },
};

async function uploadPrizeImage(file: File, label: string): Promise<string> {
  const path = `prizes/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("app-media").upload(path, file);
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  const { data } = supabase.storage.from("app-media").getPublicUrl(path);
  return data.publicUrl;
}

const ModeratorRedemptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPrize, setEditPrize] = useState<any | null>(null);
  const [deletePrize, setDeletePrize] = useState<any | null>(null);
  const [archivePrize, setArchivePrize] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Prizes
  const { data: prizes = [], isLoading: prizesLoading } = useQuery({
    queryKey: ["mod-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select("*, prize_redemptions(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        redemption_count: Array.isArray(p.prize_redemptions) ? p.prize_redemptions.length : 0,
      }));
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
        prizeIds.length > 0 ? supabase.from("prizes").select("id, name, quantity_available").in("id", prizeIds) : { data: [] },
      ]);

      const nameMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p.display_name ?? "Unknown"]));
      const prizeMap = new Map((prizesRes.data ?? []).map((p: any) => [p.id, { name: p.name, quantity_available: p.quantity_available }]));

      return (data ?? []).map((r: any) => {
        const prize = prizeMap.get(r.prize_id);
        return {
          ...r,
          player_name: nameMap.get(r.user_id) ?? "Unknown",
          prize_name: prize?.name ?? "Unknown",
          prize_stock: prize?.quantity_available ?? null,
        };
      });
    },
  });

  const createPrizeMutation = useMutation({
    mutationFn: async ({ values, imageFile }: { values: PrizeFormValues; imageFile: File | null }) => {
      if (!user) throw new Error("Not authenticated");
      let image_url: string | null = null;
      if (imageFile) image_url = await uploadPrizeImage(imageFile, "prize");
      const { error } = await supabase.from("prizes").insert({
        name: values.name,
        description: values.description || null,
        points_cost: parseInt(values.points_cost) || 0,
        quantity_available: values.quantity_available ? parseInt(values.quantity_available) : null,
        image_url,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-prizes"] });
      toast.success("Prize created!");
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePrizeMutation = useMutation({
    mutationFn: async ({ id, values, imageFile }: { id: string; values: PrizeFormValues; imageFile: File | null }) => {
      let image_url: string | undefined;
      if (imageFile) image_url = await uploadPrizeImage(imageFile, "prize");
      const payload: any = {
        name: values.name,
        description: values.description || null,
        points_cost: parseInt(values.points_cost) || 0,
        quantity_available: values.quantity_available ? parseInt(values.quantity_available) : null,
      };
      if (image_url !== undefined) payload.image_url = image_url;
      const { error } = await supabase.from("prizes").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-prizes"] });
      toast.success("Prize updated!");
      setEditPrize(null);
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

  const deletePrizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prizes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-prizes"] });
      toast.success("Prize deleted!");
      setDeletePrize(null);
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
                          {r.status === "pending" && (() => {
                            const outOfStock = r.prize_stock !== null && r.prize_stock <= 0;
                            return (
                              <div className="flex gap-1 justify-end items-center">
                                {outOfStock && (
                                  <span className="text-xs text-destructive mr-1">Out of stock</span>
                                )}
                                <Button size="sm" variant="outline" className="gap-1 text-green-400 hover:text-green-300"
                                  disabled={outOfStock}
                                  onClick={() => updateRedemptionMutation.mutate({ id: r.id, status: "approved" })}>
                                  <CheckCircle className="h-3 w-3" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive/80"
                                  onClick={() => updateRedemptionMutation.mutate({ id: r.id, status: "denied" })}>
                                  <XCircle className="h-3 w-3" /> Deny
                                </Button>
                              </div>
                            );
                          })()}
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
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add Prize
            </Button>
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
                  {p.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base">{p.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditPrize(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletePrize(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(checked) => togglePrizeMutation.mutate({ id: p.id, is_active: checked })}
                        />
                      </div>
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

      {/* Create dialog */}
      <PrizeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Prize"
        onSubmit={(values, imageFile) => createPrizeMutation.mutate({ values, imageFile })}
        isPending={createPrizeMutation.isPending}
      />

      {/* Edit dialog */}
      <PrizeFormDialog
        open={!!editPrize}
        onOpenChange={(open) => { if (!open) setEditPrize(null); }}
        title="Edit Prize"
        initial={editPrize ? {
          name: editPrize.name,
          description: editPrize.description ?? "",
          points_cost: String(editPrize.points_cost),
          quantity_available: editPrize.quantity_available != null ? String(editPrize.quantity_available) : "",
          image_url: editPrize.image_url,
        } : undefined}
        onSubmit={(values, imageFile) => updatePrizeMutation.mutate({ id: editPrize.id, values, imageFile })}
        isPending={updatePrizeMutation.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletePrize} onOpenChange={(open) => { if (!open) setDeletePrize(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prize</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePrize?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePrizeMutation.mutate(deletePrize.id)}
            >
              {deletePrizeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModeratorRedemptions;
