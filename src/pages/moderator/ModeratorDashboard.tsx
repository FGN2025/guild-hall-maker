import { Trophy, Swords, Star, Gift, TrendingUp, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/moderator/tournaments", label: "Tournaments", description: "Manage tournaments, brackets, and results", icon: Trophy },
  { to: "/moderator/matches", label: "Matches", description: "Score matches and advance players", icon: Swords },
  { to: "/moderator/points", label: "Points", description: "Award and adjust player points", icon: Star },
  { to: "/moderator/challenges", label: "Challenges", description: "Create and manage player challenges", icon: Target },
  { to: "/moderator/ladders", label: "Ladders", description: "Manage ranked ladders and progression", icon: TrendingUp },
  { to: "/moderator/redemptions", label: "Redemptions", description: "Review and approve prize redemptions", icon: Gift },
];

const ModeratorDashboard = () => {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Moderator Dashboard</h1>
      <p className="text-muted-foreground font-body mb-8">
        Manage competitions, points, and player progression.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <link.icon className="h-6 w-6 text-primary" />
                <CardTitle className="font-display text-lg">{link.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-body">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ModeratorDashboard;
