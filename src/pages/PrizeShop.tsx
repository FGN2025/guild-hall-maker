import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, ShoppingBag, Clock, CheckCircle2, XCircle, Package } from "lucide-react";
import { toast } from "sonner";
import PageBackground from "@/components/PageBackground";
import PointsWalletCard from "@/components/shared/PointsWalletCard";

const PrizeShop = () => {
  usePageTitle("Prize Shop");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmPrize, setConfirmPrize] = useState<any>(null);

  // Aggregate available points across ALL active game seasons
  const { data: seasonScore } = useQuery({
    queryKey: ["player-season-score", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: activeSeasons } = await supabase
        .from("seasons")
        .select("id")
        .eq("status", "active");
      if (!activeSeasons || activeSeasons.length === 0) return null;
      const seasonIds = activeSeasons.map((s: any) => s.id);
      const { data: scores } = await supabase
        .from("season_scores")
        .select("points, points_available")
        .eq("user_id", user!.id)
        .in("season_id", seasonIds);
      if (!scores || scores.length === 0) return null;
      return {
        points: scores.reduce((sum: number, s: any) => sum + (s.points ?? 0), 0),
        points_available: scores.reduce((sum: number, s: any) => sum + (s.points_available ?? 0), 0),
      };
    },
  });

  const availablePoints = (seasonScore as any)?.points_available ?? 0;
  const totalEarned = seasonScore?.points ?? 0;

  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ["shop-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prizes")
        .select("*")
        .eq("is_active", true)
        .is("archived_at", null)
        .order("points_cost", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myRedemptions = [] } = useQuery({
    queryKey: ["my-redemptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prize_redemptions")
        .select("*, prizes:prize_id(name, points_cost)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Count current-month redemptions per prize (pending/approved/fulfilled count toward cap)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyCounts = new Map<string, number>();
  for (const r of myRedemptions as any[]) {
    if (!["pending", "approved", "fulfilled"].includes(r.status)) continue;
    if (new Date(r.created_at) < monthStart) continue;
    monthlyCounts.set(r.prize_id, (monthlyCounts.get(r.prize_id) ?? 0) + 1);
  }

  const redeemMutation = useMutation({
    mutationFn: async (prize: any) => {
      if (!user) throw new Error("Not authenticated");
      if (availablePoints < prize.points_cost) throw new Error("Not enough points");
      const { error } = await supabase.from("prize_redemptions").insert({
        user_id: user.id,
        prize_id: prize.id,
        points_spent: prize.points_cost,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["shop-prizes"] });
      toast.success("Redemption request submitted! A moderator will review it shortly.");
      setConfirmPrize(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "fulfilled":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "denied":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "fulfilled":
        return "bg-green-500/20 text-green-400";
      case "denied":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-yellow-500/20 text-yellow-400";
    }
  };

  return (
    <>
      <PageBackground pageSlug="prize-shop" />
      <div className="space-y-8">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 md:-mx-6 md:px-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3 page-heading">
                <Gift className="h-8 w-8 text-primary" />
                Prize Shop
              </h1>
              <p className="text-muted-foreground font-body mt-1 page-heading">
                Spend your season points on awesome prizes.
              </p>
            </div>
            <PointsWalletCard />
          </div>
        </div>

        <Tabs defaultValue="shop">
          <TabsList>
            <TabsTrigger value="shop">Shop</TabsTrigger>
            <TabsTrigger value="my-requests">
              My Requests {myRedemptions.length > 0 && `(${myRedemptions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : prizes.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Prizes Available</h3>
                  <p className="text-muted-foreground font-body">Check back soon for new prizes!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {prizes.map((prize: any) => {
                  const canAfford = availablePoints >= prize.points_cost;
                  const outOfStock = prize.quantity_available !== null && prize.quantity_available <= 0;
                  return (
                    <Card key={prize.id} className={`transition-colors glow-card ${canAfford && !outOfStock ? "hover:border-primary/40" : "opacity-60"}`}>
                      <CardContent className="p-5 flex flex-col h-full">
                        {prize.image_url && (
                          <div className="aspect-video rounded-md overflow-hidden mb-4 bg-muted">
                            <img src={prize.image_url} alt={prize.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <h3 className="font-display font-semibold text-foreground text-lg mb-1">{prize.name}</h3>
                        {prize.description && (
                          <p className="text-sm text-muted-foreground font-body mb-4 flex-1">{prize.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-sm">
                              {prize.points_cost} pts
                            </Badge>
                            {prize.quantity_available !== null && (
                              <span className="text-xs text-muted-foreground">
                                {outOfStock ? "Out of stock" : `${prize.quantity_available} left`}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            disabled={!canAfford || outOfStock}
                            onClick={() => setConfirmPrize(prize)}
                          >
                            {outOfStock ? "Sold Out" : canAfford ? "Redeem" : "Not Enough"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-requests" className="mt-6">
            {myRedemptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-body">You haven't redeemed any prizes yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRedemptions.map((r: any) => (
                  <Card key={r.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {statusIcon(r.status)}
                        <div>
                          <p className="font-medium text-foreground">{(r as any).prizes?.name ?? "Prize"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()} · {r.points_spent} pts
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColor(r.status)}>{r.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm dialog */}
        <Dialog open={!!confirmPrize} onOpenChange={() => setConfirmPrize(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Confirm Redemption</DialogTitle>
            </DialogHeader>
            {confirmPrize && (
              <div className="space-y-4 mt-2">
                <p className="text-foreground">
                  Redeem <strong>{confirmPrize.name}</strong> for{" "}
                  <span className="font-mono text-primary">{confirmPrize.points_cost} points</span>?
                </p>
                <p className="text-sm text-muted-foreground">
                  Available balance: <span className="font-mono">{availablePoints} pts</span> →{" "}
                  <span className="font-mono">{availablePoints - confirmPrize.points_cost} pts</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  A moderator will review your request. Points will be deducted upon approval.
                </p>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setConfirmPrize(null)}>Cancel</Button>
                  <Button
                    onClick={() => redeemMutation.mutate(confirmPrize)}
                    disabled={redeemMutation.isPending}
                  >
                    {redeemMutation.isPending ? "Submitting..." : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default PrizeShop;
