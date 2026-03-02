import { GameBenchmark, GenreInsight } from "@/hooks/useSkillInsights";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Lightbulb, Gamepad2 } from "lucide-react";

interface Props {
  gameInsights: GameBenchmark[];
  genreInsights: GenreInsight[];
}

const SkillInsightsPanel = ({ gameInsights, genreInsights }: Props) => {
  if (gameInsights.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-heading text-base text-foreground mb-1">No Skill Data Yet</h3>
        <p className="text-sm text-muted-foreground font-body">
          Play some matches to see personalized improvement insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Genre overview */}
      {genreInsights.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Genre Performance
          </h3>
          <div className="flex flex-wrap gap-3">
            {genreInsights.map((g) => (
              <div
                key={g.category}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2"
              >
                {g.label === "strength" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : g.label === "improve" ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-heading text-sm text-foreground">{g.category}</span>
                <Badge
                  variant={g.label === "strength" ? "default" : g.label === "improve" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {g.avgWinRate}% WR
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-game insights */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Game-by-Game Insights
        </h3>
        <div className="space-y-3">
          {gameInsights.map((gi) => (
            <div
              key={gi.game_name}
              className={`rounded-lg border p-4 ${
                gi.isStrength
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-foreground">{gi.game_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {gi.category}
                  </Badge>
                </div>
                <Badge
                  variant={gi.isStrength ? "default" : "destructive"}
                  className="text-xs"
                >
                  {gi.isStrength ? "Strength" : "Improve"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                <span>
                  Your WR: <span className="font-display font-bold text-foreground">{gi.playerWinRate}%</span>
                </span>
                <span>
                  Top 10%: <span className="font-display font-bold text-foreground">{gi.top10WinRate}%</span>
                </span>
                <span>
                  Matches: <span className="font-display font-bold text-foreground">{gi.playerMatches}</span>
                </span>
                {gi.playerAvgMargin !== 0 && (
                  <span>
                    Avg Margin: <span className={`font-display font-bold ${gi.playerAvgMargin >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {gi.playerAvgMargin > 0 ? "+" : ""}{gi.playerAvgMargin}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-body">{gi.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillInsightsPanel;
