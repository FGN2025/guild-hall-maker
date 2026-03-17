import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGames, Game } from "@/hooks/useGames";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Gamepad2, ScrollText, ArrowRight, ArrowLeft, Check, User, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Welcome", "Profile", "Games", "Explore"];

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gamerTag, setGamerTag] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { data: games = [], isLoading: gamesLoading } = useGames();

  const progress = ((step + 1) / STEPS.length) * 100;

  const toggleGame = (id: string) => {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = { onboarding_completed: true };
      if (gamerTag.trim()) updates.gamer_tag = gamerTag.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);

      if (error) throw error;
      onComplete();
      toast.success("Welcome aboard! 🎮");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 1 && !gamerTag.trim()) return true; // optional
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <Card className="w-full max-w-lg border-primary/20 shadow-2xl shadow-primary/10">
        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "text-xs font-heading transition-colors",
                  i <= step ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <CardContent className="p-6 pt-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Welcome to FGN!
              </h2>
              <p className="text-muted-foreground font-body max-w-sm mx-auto">
                Let's get you set up in less than a minute. We'll personalize
                your experience so you can jump straight into the action.
              </p>
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Your Gamer Identity
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a gamer tag so other players can find you.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onb-gamertag" className="text-foreground">
                  Gamer Tag <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="onb-gamertag"
                  placeholder="e.g. xShadowStrike"
                  value={gamerTag}
                  onChange={(e) => setGamerTag(e.target.value)}
                  maxLength={30}
                />
              </div>
            </div>
          )}

          {/* Step 2: Games */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Pick Your Games
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select games you enjoy — we'll highlight relevant tournaments and challenges.
                </p>
              </div>
              {gamesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {games.map((g: Game) => {
                    const selected = selectedGames.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGame(g.id)}
                        className={cn(
                          "relative rounded-lg border p-2.5 text-left transition-all text-sm font-heading",
                          selected
                            ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {selected && (
                          <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                        )}
                        <span className="line-clamp-2">{g.name}</span>
                        <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                          {g.category}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedGames.length > 0 && (
                <p className="text-xs text-primary text-center font-heading">
                  {selectedGames.length} game{selectedGames.length !== 1 && "s"} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Explore */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                You're All Set!
              </h2>
              <p className="text-muted-foreground font-body max-w-sm mx-auto">
                Your profile is ready. Here's what you can explore next:
              </p>
              <div className="grid gap-2 text-left max-w-xs mx-auto">
                {[
                  { icon: ScrollText, label: "Browse Quests", desc: "Complete tasks, earn XP, rank up", path: "/quests" },
                  { icon: Gamepad2, label: "Join a Tournament", desc: "Compete and climb the leaderboard", path: "/tournaments" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      finishOnboarding().then(() => navigate(item.path));
                    }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-heading font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={finishOnboarding} disabled={saving}>
                {saving ? "Saving…" : "Go to Dashboard"}{" "}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Skip */}
          {step < STEPS.length - 1 && (
            <div className="text-center mt-3">
              <button
                onClick={finishOnboarding}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Skip onboarding
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;
