import { useGlobalAchievements } from "@/hooks/useGlobalAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Award, Trophy, Crown, Medal, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import PageHero from "@/components/PageHero";
import PageBackground from "@/components/PageBackground";
import usePageTitle from "@/hooks/usePageTitle";

const tierBadge = (label: string, count: number, color: string) =>
  count > 0 ? (
    <span className={`inline-flex items-center gap-1 text-[10px] font-display uppercase tracking-wider ${color}`}>
      {count} {label}
    </span>
  ) : null;

const Achievements = () => {
  usePageTitle("Achievements");
  const { data: players, isLoading } = useGlobalAchievements();

  return (
    <div className="min-h-screen bg-background grid-bg relative">
      <PageBackground pageSlug="achievements" />
      <div className="py-8 container mx-auto px-4 relative z-10">
        <PageHero pageSlug="achievements" />
        <div className="mb-6">
          <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">
            Global Rankings
          </p>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Achievements Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-2">
            Players ranked by total achievements unlocked across all milestones.
          </p>
        </div>

        {isLoading ? (
          <>
            {/* Skeleton podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 text-center animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                  <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
                  <Skeleton className="h-5 w-28 mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
            {/* Skeleton table rows */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50 animate-pulse" style={{ animationDelay: `${(i + 3) * 75}ms` }}>
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <div className="ml-auto flex gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !players || players.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg text-foreground mb-2">No achievements yet</h3>
            <p className="text-sm text-muted-foreground font-body">
              Achievements will appear once players have completed matches.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {players.slice(0, 3).map((p, i) => (
                <PodiumCard key={p.userId} player={p} rank={i + 1} />
              ))}
            </div>

            {/* Full table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  All Players
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-2">Player</th>
                      <th className="text-center py-3 px-2">Unlocked</th>
                      <th className="text-center py-3 px-2">Progress</th>
                      <th className="text-center py-3 px-2 hidden sm:table-cell">Tiers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p, i) => (
                      <tr
                        key={p.userId}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-display font-bold text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-3 px-2">
                          <Link
                            to={`/player/${p.userId}`}
                            className="flex items-center gap-2 group"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={p.avatarUrl ?? undefined} />
                              <AvatarFallback className="bg-muted text-muted-foreground font-heading text-xs">
                                {p.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {p.displayName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-center font-display font-bold text-primary">
                          {p.unlocked}/{p.total}
                        </td>
                        <td className="py-3 px-2 text-center w-32">
                          <Progress
                            value={(p.unlocked / p.total) * 100}
                            className="h-1.5 bg-muted"
                          />
                        </td>
                        <td className="py-3 px-2 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-3">
                            {tierBadge("P", p.tiers.platinum, "text-cyan-300")}
                            {tierBadge("G", p.tiers.gold, "text-yellow-400")}
                            {tierBadge("S", p.tiers.silver, "text-slate-300")}
                            {tierBadge("B", p.tiers.bronze, "text-orange-400")}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const rankIcons = [Crown, Medal, Shield];
const rankColors = [
  "border-yellow-500/50 bg-yellow-500/5",
  "border-slate-400/50 bg-slate-400/5",
  "border-orange-500/50 bg-orange-500/5",
];
const rankIconColors = ["text-yellow-400", "text-slate-300", "text-orange-400"];

const PodiumCard = ({
  player,
  rank,
}: {
  player: ReturnType<typeof useGlobalAchievements>["data"] extends (infer T)[] | undefined ? T : never;
  rank: number;
}) => {
  const Icon = rankIcons[rank - 1] ?? Award;
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col items-center text-center ${
        rankColors[rank - 1] ?? "border-border bg-card"
      }`}
    >
      <Icon className={`h-8 w-8 mb-3 ${rankIconColors[rank - 1] ?? "text-muted-foreground"}`} />
      <Avatar className="h-14 w-14 mb-3">
        <AvatarImage src={player.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-muted text-muted-foreground font-heading">
          {player.displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <Link
        to={`/player/${player.userId}`}
        className="font-heading font-bold text-foreground hover:text-primary transition-colors"
      >
        {player.displayName}
      </Link>
      <p className="font-display text-2xl font-bold text-primary mt-1">
        {player.unlocked}
        <span className="text-sm text-muted-foreground">/{player.total}</span>
      </p>
      <p className="text-xs text-muted-foreground font-body mt-1">achievements unlocked</p>
      <div className="flex items-center gap-2 mt-3">
        {tierBadge("Plat", player.tiers.platinum, "text-cyan-300")}
        {tierBadge("Gold", player.tiers.gold, "text-yellow-400")}
        {tierBadge("Silver", player.tiers.silver, "text-slate-300")}
        {tierBadge("Bronze", player.tiers.bronze, "text-orange-400")}
      </div>
    </div>
  );
};

export default Achievements;
