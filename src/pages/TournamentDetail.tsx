import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTournaments } from "@/hooks/useTournaments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Gamepad2,
  FileText,
  GitBranch,
  Settings,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import PrizeDisplay from "@/components/tournaments/PrizeDisplay";
import AchievementBadgeDisplay from "@/components/shared/AchievementBadgeDisplay";
import { format } from "date-fns";
import RulesPdfViewer from "@/components/tournaments/RulesPdfViewer";
import PageBackground from "@/components/PageBackground";
import { useCanSeeRegistrationCounts } from "@/hooks/useCanSeeRegistrationCounts";
import { fetchTournamentCapacity } from "@/lib/tournamentCapacity";

const TournamentDetail = () => {
  usePageTitle("Tournament Detail");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isModerator } = useAuth();
  const canSeeRegCount = useCanSeeRegistrationCounts();
  const { register, unregister, isRegistering } = useTournaments();
  const [inviteCode, setInviteCode] = useState("");
  const [verifying, setVerifying] = useState(false);


  const { data: tournament, isLoading } = useQuery({
    queryKey: ["tournament-detail", id, canSeeRegCount],
    queryFn: async () => {
      const { data: t, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;

      const [capacityMap, myRegRes] = await Promise.all([
        fetchTournamentCapacity([id!], canSeeRegCount),
        user
          ? supabase
              .from("tournament_registrations")
              .select("user_id")
              .eq("tournament_id", id!)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      const { data: games } = await supabase
        .from("games")
        .select("name, cover_image_url")
        .eq("name", t.game)
        .maybeSingle();

      const cap = capacityMap.get(id!);

      return {
        ...t,
        registrations_count: cap?.count ?? null,
        is_full: cap?.is_full ?? false,
        is_registered: !!(myRegRes as any)?.data,
        game_cover_url: games?.cover_image_url ?? null,
      };
    },
    enabled: !!id,
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading tournament…
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Tournament not found.</p>
        <Button variant="outline" onClick={() => navigate("/tournaments")}>
          Back to Tournaments
        </Button>
      </div>
    );
  }

  const t = tournament;
  const isFull = t.is_full;
  const canRegister = (t.status === "open" || t.status === "upcoming") && !isFull && !t.is_registered;
  const isCreator = user?.id === t.created_by;
  const canManage = isAdmin || isModerator || isCreator;
  const coverUrl = t.image_url || t.game_cover_url;

  return (
    <div className="relative">
      <PageBackground pageSlug="tournaments" />
      <div className="space-y-6 relative z-10">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Hero section */}
      <div className="glass-panel border border-border/50 rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Cover image */}
          {coverUrl && (
            <div className="md:w-[320px] shrink-0">
              <img
                src={coverUrl}
                alt={t.game}
                className="w-full h-full object-cover md:min-h-[360px]"
              />
            </div>
          )}

          {/* Info panel */}
          <div className="flex-1 p-6 md:p-8 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="bg-primary/15 text-primary border-primary/30 capitalize"
                >
                  {t.status.replace("_", " ")}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {t.format.replace("_", " ")}
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                {t.name}
              </h1>
              <p className="text-muted-foreground font-body mt-1">{t.game}</p>
            </div>

            {t.description && (
              <p className="text-sm text-muted-foreground font-body whitespace-pre-line">
                {t.description}
              </p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Calendar,
                    label: "Start Date",
                    value: format(new Date(t.start_date), "MMM d, yyyy · h:mm a"),
                  },
                  {
                    icon: Users,
                    label: "Players",
                    value:
                      canSeeRegCount && t.registrations_count !== null
                        ? `${t.registrations_count} / ${t.max_participants}`
                        : `${t.max_participants} max`,
                  },
                  {
                    icon: Gamepad2,
                    label: "Entry Fee",
                    value: t.entry_fee ? `$${t.entry_fee}` : "Free",
                  },
                ].map((info) => (
                  <div key={info.label} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <info.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {info.label}
                      </span>
                    </div>
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {info.value}
                    </p>
                  </div>
                ))}
                {/* Prize Pool — full display with breakdown */}
                <div className="bg-muted rounded-lg p-3 col-span-2">
                  <span className="text-xs text-muted-foreground mb-1 block">Prize Pool</span>
                  <PrizeDisplay
                    prizeType={t.prize_type}
                    prizePool={t.prize_pool}
                    format={t.format}
                    pointsFirst={t.points_first}
                    pointsSecond={t.points_second}
                    pointsThird={t.points_third}
                    pointsParticipationLong={(t as any).points_participation_long}
                    pointsParticipationShort={(t as any).points_participation_short}
                  />
                </div>
            </div>

            {/* Achievement Reward */}
            {t.achievement_id && (
              <div>
                <span className="text-xs text-muted-foreground mb-1 block">Earn on Completion</span>
                <AchievementBadgeDisplay achievementId={t.achievement_id} />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {canManage && (
                <Button
                  variant="outline"
                  className="w-full font-heading tracking-wide border-accent/30 text-accent hover:bg-accent/10 py-5"
                  onClick={() => navigate(`/tournaments/${t.id}/manage`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Tournament
                </Button>
              )}

              {(t.status === "in_progress" || t.status === "completed") && (
                <Button
                  variant="outline"
                  className="w-full font-heading tracking-wide border-primary/30 text-primary hover:bg-primary/10 py-5"
                  onClick={() => navigate(`/tournaments/${t.id}/bracket`)}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  View Bracket
                </Button>
              )}

              {user ? (
                t.is_registered ? (
                  <Button
                    variant="secondary"
                    className="w-full font-heading tracking-wide py-5"
                    onClick={() => unregister(t.id)}
                    disabled={isRegistering}
                  >
                    Cancel Registration
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {(t as any).requires_invite_code && (
                      <div className="space-y-2">
                        <Label htmlFor="tournament-invite-code" className="font-heading text-sm text-foreground">
                          Invite Code <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="tournament-invite-code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Enter tournament invite code"
                            maxLength={50}
                            className="pl-10 bg-card border-border font-body"
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
                      onClick={async () => {
                        if ((t as any).requires_invite_code) {
                          const entered = inviteCode.trim();
                          if (!entered) {
                            toast.error("An invite code is required to register for this tournament.");
                            return;
                          }
                          setVerifying(true);
                          try {
                            const { data, error } = await supabase.functions.invoke("validate-tenant-code", {
                              body: { code: entered, dry_run: true },
                            });
                            if (error || !data?.valid) {
                              toast.error("Invalid or expired invite code.");
                              return;
                            }
                            const pinned = (t as any).invite_code_id as string | null;
                            if (pinned && data.code_id && data.code_id !== pinned) {
                              toast.error("This code isn't valid for this tournament.");
                              return;
                            }
                          } finally {
                            setVerifying(false);
                          }
                          register({ tournamentId: t.id, inviteCode: entered });
                        } else {
                          register(
                            inviteCode.trim()
                              ? { tournamentId: t.id, inviteCode: inviteCode.trim() }
                              : t.id
                          );
                        }
                      }}
                      disabled={!canRegister || isRegistering || verifying}
                    >
                      {isFull ? "Tournament Full" : verifying ? "Verifying..." : "Register Now"}
                    </Button>
                  </div>
                )
              ) : (
                <Button
                  className="w-full font-heading tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 py-5"
                  onClick={() => navigate("/auth")}
                >
                  Sign In to Register
                </Button>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Rules section */}
      {t.rules && (
        <div className="glass-panel border border-border/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Rules
            </h2>
          </div>
          {/^https?:\/\/.+\.pdf(\?.*)?$/i.test(t.rules) ? (
            <RulesPdfViewer url={t.rules} />
          ) : (
            <p className="text-sm text-muted-foreground font-body whitespace-pre-wrap leading-relaxed">
              {t.rules}
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default TournamentDetail;
