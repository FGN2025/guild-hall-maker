export interface ExportColumn {
  key: string;
  label: string;
}

function escCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getValue(row: Record<string, any>, key: string): string {
  const val = key.split(".").reduce((o, k) => o?.[k], row);
  if (val == null) return "";
  if (val instanceof Date) return val.toLocaleDateString();
  return String(val);
}

export function exportTableCSV(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
) {
  const header = columns.map((c) => escCsv(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escCsv(getValue(r, c.key))).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTablePDF(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  title: string,
) {
  const thCells = columns.map((c) => `<th>${escHtml(c.label)}</th>`).join("");
  const bodyRows = rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${escHtml(getValue(r, c.key))}</td>`).join("")}</tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;padding:40px;max-width:1100px;margin:auto;font-size:13px}
  h1{font-size:22px;margin-bottom:4px;border-bottom:3px solid #0ee;padding-bottom:8px}
  .meta{font-size:11px;color:#888;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:6px 10px;border:1px solid #ddd}
  th{background:#f5f5f5;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:0.05em}
  .badge{display:inline-block;background:#0aa;color:white;padding:2px 8px;border-radius:4px;font-size:10px;text-transform:uppercase;letter-spacing:0.05em}
  @media print{body{padding:20px}}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <span class="badge">FGN</span>
  <span class="meta">Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
</div>
<h1>${escHtml(title)}</h1>
<p class="meta">${rows.length} record${rows.length !== 1 ? "s" : ""}</p>
<table><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
}
