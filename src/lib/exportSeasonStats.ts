import type { SeasonStatsData } from "@/hooks/useSeasonStats";

function buildCsvContent(stats: SeasonStatsData, seasonName: string): string {
  const lines: string[] = [];

  lines.push(`Season Report: ${seasonName}`);
  lines.push("");

  // Summary
  lines.push("SUMMARY");
  lines.push(`Total Players,${stats.totalPlayers}`);
  lines.push(`Total Matches,${stats.totalMatches}`);
  lines.push(`Total Points,${stats.totalPoints}`);
  lines.push(`Avg Points/Match,${stats.avgPointsPerMatch}`);
  lines.push("");

  // Tier distribution
  lines.push("TIER DISTRIBUTION");
  lines.push("Tier,Count");
  stats.tierDistribution.forEach((t) => {
    lines.push(`${t.tier.charAt(0).toUpperCase() + t.tier.slice(1)},${t.count}`);
  });
  lines.push("");

  // Top players
  lines.push("TOP PLAYERS");
  lines.push("Rank,Player,Points,Wins,Losses,Win Rate,Tournaments");
  stats.topPlayers.forEach((p, i) => {
    const total = p.wins + p.losses;
    const wr = total > 0 ? Math.round((p.wins / total) * 100) : 0;
    const name = `"${p.display_name.replace(/"/g, '""')}"`;
    lines.push(`${i + 1},${name},${p.points},${p.wins},${p.losses},${wr}%,${p.tournaments_played}`);
  });

  return lines.join("\n");
}

export function exportCsv(stats: SeasonStatsData, seasonName: string) {
  const csv = buildCsvContent(stats, seasonName);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${sanitize(seasonName)}_stats.csv`);
}

export function exportPdf(stats: SeasonStatsData, seasonName: string) {
  // Generate a printable HTML document and trigger browser print-to-PDF
  const total = (p: { wins: number; losses: number }) => p.wins + p.losses;
  const wr = (p: { wins: number; losses: number }) => {
    const t = total(p);
    return t > 0 ? Math.round((p.wins / t) * 100) : 0;
  };

  const tierRows = stats.tierDistribution
    .map((t) => `<tr><td>${t.tier.charAt(0).toUpperCase() + t.tier.slice(1)}</td><td>${t.count}</td></tr>`)
    .join("");

  const playerRows = stats.topPlayers
    .map(
      (p, i) =>
        `<tr><td>${i + 1}</td><td>${escHtml(p.display_name)}</td><td>${p.points}</td><td>${p.wins}</td><td>${p.losses}</td><td>${wr(p)}%</td><td>${p.tournaments_played}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(seasonName)} — Season Report</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:auto}
  h1{font-size:24px;margin-bottom:4px} h2{font-size:16px;margin-top:28px;border-bottom:2px solid #0ee;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #e0e0e0}
  th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:0.05em}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}
  .card{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}
  .card .value{font-size:28px;font-weight:700;color:#0aa} .card .label{font-size:11px;color:#888;text-transform:uppercase}
  @media print{body{padding:20px}}
</style></head><body>
<h1>${escHtml(seasonName)}</h1>
<p style="color:#888;font-size:13px">Season Statistics Report</p>

<div class="cards">
  <div class="card"><div class="value">${stats.totalPlayers}</div><div class="label">Players</div></div>
  <div class="card"><div class="value">${stats.totalMatches}</div><div class="label">Matches</div></div>
  <div class="card"><div class="value">${stats.totalPoints}</div><div class="label">Total Points</div></div>
  <div class="card"><div class="value">${stats.avgPointsPerMatch}</div><div class="label">Avg Pts/Match</div></div>
</div>

<h2>Tier Distribution</h2>
<table><thead><tr><th>Tier</th><th>Count</th></tr></thead><tbody>${tierRows}</tbody></table>

<h2>Top Players</h2>
<table><thead><tr><th>#</th><th>Player</th><th>Points</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>Tournaments</th></tr></thead><tbody>${playerRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
