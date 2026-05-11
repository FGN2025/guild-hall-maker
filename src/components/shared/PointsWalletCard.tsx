import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  compact?: boolean;
}

const PointsWalletCard = ({ compact = false }: Props) => {
  const { user } = useAuth();

  const { data: seasonScore } = useQuery({
    queryKey: ["player-season-score", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: scores } = await supabase
        .from("season_scores")
        .select("points, points_available")
        .eq("user_id", user!.id);
      if (!scores || scores.length === 0) return null;
      return {
        points: scores.reduce((sum: number, s: any) => sum + (s.points ?? 0), 0),
        points_available: scores.reduce((sum: number, s: any) => sum + (s.points_available ?? 0), 0),
      };
    },
  });

  if (!user) return null;

  const available = (seasonScore as any)?.points_available ?? 0;
  const earned = seasonScore?.points ?? 0;

  if (compact) {
    return (
      <Link to="/prize-shop" className="block">
        <Card className="hover:border-primary/40 transition-colors glow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-body">Points Wallet</p>
              <p className="text-lg font-bold font-mono text-primary">{available} <span className="text-xs text-muted-foreground font-normal">available</span></p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="glow-card">
      <CardContent className="p-4 flex items-center gap-4">
        <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Spendable</p>
          <p className="text-xl font-bold font-mono text-primary">{available} pts</p>
        </div>
        <div className="border-l border-border pl-4">
          <p className="text-xs text-muted-foreground">Lifetime Earned</p>
          <p className="text-sm font-mono text-muted-foreground">{earned} pts</p>
        </div>
        <Link
          to="/prize-shop"
          className="ml-auto text-xs text-primary hover:underline font-medium flex items-center gap-1"
        >
          Prize Shop <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default PointsWalletCard;
