import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import MeritCard from "@/components/merits/MeritCard";
import { getMeritIcon } from "@/components/merits/meritIcons";
import { useMeritPathways } from "@/hooks/useMeritPathways";

const Pathways = () => {
  usePageTitle("Merit Pathways");
  const { user } = useAuth();
  const { pathways, isLoading } = useMeritPathways();

  const totalMerits = pathways.reduce((s, p) => s + p.merits.length, 0);
  const totalChallenges = pathways.reduce((s, p) => s + p.totalCount, 0);
  const totalVerified = pathways.reduce((s, p) => s + p.completedCount, 0);

  return (
    <>
      <PageBackground pageSlug="pathways" />
      <div className="space-y-6">
        <div className="rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-5">
          <h1 className="font-display text-3xl font-bold text-white flex items-center gap-3">
            <Compass className="h-8 w-8 text-primary" />
            Merit Pathways
          </h1>
          <p className="text-white/75 font-body mt-1">
            Career-aligned skill tracks. Finish the challenges in a merit to build a verified record you can take to a
            counselor — game work never awards an official badge on its own.
          </p>
        </div>

        {user && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-mono text-primary">{pathways.length}</p>
                <p className="text-xs text-muted-foreground">Pathways</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-mono text-foreground">{totalMerits}</p>
                <p className="text-xs text-muted-foreground">Merits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-mono text-green-400">
                  {totalVerified} / {totalChallenges}
                </p>
                <p className="text-xs text-muted-foreground">Verified challenges</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!user && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>{" "}
                to track your progress through each merit.
              </p>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : pathways.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Compass className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Pathways Yet</h3>
              <p className="text-muted-foreground font-body">Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pathways.map((p) => {
              const Icon = getMeritIcon(p.icon);
              const pct = p.totalCount > 0 ? (p.completedCount / p.totalCount) * 100 : 0;
              return (
                <div key={p.id} className="space-y-3">
                  <div className="rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-lg font-semibold text-white">{p.name}</h2>
                    </div>
                    {p.description && <p className="text-sm text-white/70 font-body">{p.description}</p>}
                    {user && p.totalCount > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>Pathway progress</span>
                          <span className="font-mono">
                            {p.completedCount} / {p.totalCount}
                          </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {p.merits.map((m) => (
                      <MeritCard key={m.id} merit={m} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Pathways;
