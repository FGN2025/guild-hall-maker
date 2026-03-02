import { useMemo } from "react";
import { useSkillInsights } from "@/hooks/useSkillInsights";
import { Gamepad2 } from "lucide-react";

interface GameBreakdownTableProps {
  playerAId: string | null;
  playerBId: string | null;
  playerAName: string;
  playerBName: string;
}

interface GameRow {
  game: string;
  category: string;
  aWinRate: number | null;
  aMargin: number | null;
  aMatches: number | null;
  bWinRate: number | null;
  bMargin: number | null;
  bMatches: number | null;
}

const GameBreakdownTable = ({ playerAId, playerBId, playerAName, playerBName }: GameBreakdownTableProps) => {
  const { data: insightsA, isLoading: loadingA } = useSkillInsights(playerAId ?? undefined);
  const { data: insightsB, isLoading: loadingB } = useSkillInsights(playerBId ?? undefined);

  const rows = useMemo((): GameRow[] => {
    if (!insightsA && !insightsB) return [];

    const gamesA = new Map((insightsA?.gameInsights ?? []).map((g) => [g.game_name, g]));
    const gamesB = new Map((insightsB?.gameInsights ?? []).map((g) => [g.game_name, g]));
    const allGames = new Set([...gamesA.keys(), ...gamesB.keys()]);

    return Array.from(allGames)
      .map((game): GameRow => {
        const a = gamesA.get(game);
        const b = gamesB.get(game);
        return {
          game,
          category: a?.category ?? b?.category ?? "General",
          aWinRate: a?.playerWinRate ?? null,
          aMargin: a?.playerAvgMargin ?? null,
          aMatches: a?.playerMatches ?? null,
          bWinRate: b?.playerWinRate ?? null,
          bMargin: b?.playerAvgMargin ?? null,
          bMatches: b?.playerMatches ?? null,
        };
      })
      .sort((a, b) => ((b.aMatches ?? 0) + (b.bMatches ?? 0)) - ((a.aMatches ?? 0) + (a.bMatches ?? 0)));
  }, [insightsA, insightsB]);

  if (loadingA || loadingB) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  const fmt = (v: number | null, suffix = "") => (v != null ? `${v}${suffix}` : "—");
  const fmtMargin = (v: number | null) => {
    if (v == null) return "—";
    const prefix = v > 0 ? "+" : "";
    return `${prefix}${v}`;
  };

  const highlight = (a: number | null, b: number | null, higher = true) => {
    if (a == null || b == null || a === b) return { a: "", b: "" };
    const aWins = higher ? a > b : a < b;
    return { a: aWins ? "text-primary font-bold" : "", b: !aWins ? "text-destructive font-bold" : "" };
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 mt-8">
      <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Gamepad2 className="h-5 w-5 text-primary" />
        Per-Game Breakdown
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-display text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-3 px-2">Game</th>
              <th className="text-center py-3 px-2 text-primary">Win %</th>
              <th className="text-center py-3 px-2 text-primary">Margin</th>
              <th className="text-center py-3 px-2 text-primary">Matches</th>
              <th className="text-center py-3 px-2 text-destructive">Win %</th>
              <th className="text-center py-3 px-2 text-destructive">Margin</th>
              <th className="text-center py-3 px-2 text-destructive">Matches</th>
            </tr>
            <tr className="border-b border-border/50 text-[10px] text-muted-foreground uppercase tracking-wider">
              <th />
              <th className="text-center py-1 px-2" colSpan={3}>{playerAName}</th>
              <th className="text-center py-1 px-2" colSpan={3}>{playerBName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const wr = highlight(row.aWinRate, row.bWinRate);
              const mg = highlight(row.aMargin, row.bMargin);
              const mc = highlight(row.aMatches, row.bMatches);
              return (
                <tr key={row.game} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="font-heading text-foreground">{row.game}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground uppercase">{row.category}</span>
                  </td>
                  <td className={`py-3 px-2 text-center font-display ${wr.a}`}>{fmt(row.aWinRate, "%")}</td>
                  <td className={`py-3 px-2 text-center font-display ${mg.a}`}>{fmtMargin(row.aMargin)}</td>
                  <td className={`py-3 px-2 text-center font-display ${mc.a}`}>{fmt(row.aMatches)}</td>
                  <td className={`py-3 px-2 text-center font-display ${wr.b}`}>{fmt(row.bWinRate, "%")}</td>
                  <td className={`py-3 px-2 text-center font-display ${mg.b}`}>{fmtMargin(row.bMargin)}</td>
                  <td className={`py-3 px-2 text-center font-display ${mc.b}`}>{fmt(row.bMatches)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameBreakdownTable;
