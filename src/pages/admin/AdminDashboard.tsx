import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Image, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, tournaments, media, seasons] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tournaments").select("id", { count: "exact", head: true }),
        supabase.from("media_library").select("id", { count: "exact", head: true }),
        supabase.from("seasons").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return {
        users: profiles.count ?? 0,
        tournaments: tournaments.count ?? 0,
        media: media.count ?? 0,
        seasons: seasons.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users ?? 0, icon: Users, to: "/admin/users", color: "text-blue-400" },
    { label: "Tournaments", value: stats?.tournaments ?? 0, icon: Trophy, to: "/admin/tournaments", color: "text-yellow-400" },
    { label: "Media Assets", value: stats?.media ?? 0, icon: Image, to: "/admin/media", color: "text-green-400" },
    { label: "Active Seasons", value: stats?.seasons ?? 0, icon: BarChart3, to: "#", color: "text-purple-400" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-heading text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-display font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
