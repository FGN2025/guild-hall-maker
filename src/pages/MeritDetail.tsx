import { Link, useParams } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, GraduationCap, ShieldAlert, UserCheck } from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { getMeritIcon } from "@/components/merits/meritIcons";
import { useMeritPathways, useOfficialBadge } from "@/hooks/useMeritPathways";

const levelStyles: Record<string, string> = {
  discover: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
  develop: "bg-violet-400/15 text-violet-300 border-violet-400/30",
  deploy: "bg-amber-400/15 text-amber-300 border-amber-400/30",
};

const MeritDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { merits, pathways, isLoading } = useMeritPathways();
  const merit = merits.find((m) => m.slug === slug);
  usePageTitle(merit ? `${merit.name} Pathway` : "Merit Pathway");
  const pathway = pathways.find((p) => p.id === merit?.pathway_id);
  const { badge, requirements } = useOfficialBadge(slug);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!merit) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <h1 className="font-display text-xl font-semibold text-foreground mb-2">Merit not found</h1>
          <Link to="/pathways" className="text-primary hover:underline">
            Back to pathways
          </Link>
        </CardContent>
      </Card>
    );
  }

  const Icon = getMeritIcon(merit.icon);
  const pct = merit.totalCount > 0 ? (merit.completedCount / merit.totalCount) * 100 : 0;

  return (
    <>
      <PageBackground pageSlug="pathways" />
      <div className="space-y-6">
        <Link
          to="/pathways"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All pathways
        </Link>

        <div className="rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Icon className="h-7 w-7 text-primary" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-white">{merit.name}</h1>
              {pathway && <p className="text-xs uppercase tracking-widest text-white/60">{pathway.name} pathway</p>}
            </div>
          </div>
          {merit.description && <p className="text-sm text-white/75 font-body">{merit.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] capitalize ${levelStyles[merit.level] ?? ""}`}>
              {merit.level}
            </Badge>
            {merit.skills.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px] text-white/80 border-white/30">
                {s}
              </Badge>
            ))}
          </div>
          {user && merit.totalCount > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Verified challenges</span>
                <span className="font-mono">
                  {merit.completedCount} / {merit.totalCount}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Challenges in this merit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {merit.challenges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Challenges for this merit are still being authored.
              </p>
            ) : (
              merit.challenges.map((link) => {
                const done = !!user && link.completed;
                return (
                  <Link
                    key={link.id}
                    to={`/challenges/${link.challenge_id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/40 transition-colors"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {link.challenge?.name ?? "Challenge"}
                      </p>
                      {link.challenge?.games?.name && (
                        <p className="text-xs text-muted-foreground truncate">{link.challenge.games.name}</p>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {merit.academy_next_step && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Next step after this merit</p>
                <p className="text-sm text-muted-foreground font-body">{merit.academy_next_step}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {user && badge && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Official badge requirements — {badge.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground font-body">
                {badge.special_conditions_note ??
                  "A counselor signs every requirement. Game work is preparation and supporting evidence only."}
              </p>
              {badge.source_url && (
                <a
                  href={badge.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  Official requirements <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <Accordion type="multiple" className="w-full">
                {requirements.map((r) => (
                  <AccordionItem key={r.id} value={r.id}>
                    <AccordionTrigger className="text-left text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary w-10 shrink-0">{r.requirement_number}</span>
                        <span className="line-clamp-1">{r.requirement_text}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p className="text-sm text-foreground font-body">{r.requirement_text}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {r.version_year} requirements
                        </Badge>
                        {r.action_verbs.map((v) => (
                          <Badge key={v} variant="outline" className="text-[10px] text-muted-foreground">
                            {v}
                          </Badge>
                        ))}
                        {r.requires_in_person && (
                          <Badge variant="outline" className="text-[10px] bg-amber-400/15 text-amber-300 border-amber-400/30">
                            Real-world / counselor only
                          </Badge>
                        )}
                      </div>
                      {r.safety_note && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          {r.safety_note}
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default MeritDetail;
