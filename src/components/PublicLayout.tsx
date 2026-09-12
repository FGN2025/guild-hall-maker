import { Outlet, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/**
 * Layout for guests browsing the Compete surfaces (tournaments, challenges,
 * quests). Adds a persistent signup banner — guests can browse everything,
 * but participating requires a free account.
 */
const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <div className="border-b border-primary/30 bg-primary/10 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              You're browsing as a guest — create a free account to register, earn points, and climb the leaderboard.
            </span>
            <Button asChild size="sm" className="font-display tracking-wider">
              <Link to="/auth">Join Now</Link>
            </Button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
