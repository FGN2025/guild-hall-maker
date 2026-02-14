import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { usePlayerAchievements } from "@/hooks/usePlayerAchievements";
import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import PlayerStatsGrid from "@/components/player/PlayerStatsGrid";
import MatchHistoryTable from "@/components/player/MatchHistoryTable";
import HeadToHeadList from "@/components/player/HeadToHeadList";
import RankProgressionChart from "@/components/player/RankProgressionChart";
import PlayerAchievements from "@/components/player/PlayerAchievements";
import { ArrowLeft, User } from "lucide-react";

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, stats, matchHistory, headToHead, rankProgression, isLoading } = usePlayerProfile(id);
  const { data: achievements, isLoading: achievementsLoading } = usePlayerAchievements(id);

  return (
    <div className="min-h-screen bg-background grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4 max-w-5xl">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-body text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leaderboard
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !profile ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">Player not found</h3>
            <p className="text-sm text-muted-foreground font-body">
              This player profile doesn't exist or has been removed.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <PlayerProfileHeader profile={profile} stats={stats} />
            <PlayerStatsGrid stats={stats} />

            {achievements && achievements.length > 0 && (
              <PlayerAchievements achievements={achievements} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RankProgressionChart data={rankProgression ?? []} />
              <HeadToHeadList records={headToHead ?? []} />
            </div>

            <MatchHistoryTable matches={matchHistory ?? []} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
