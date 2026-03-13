import type { WebPageSection } from "@/hooks/useWebPages";

/** Render a section to standalone HTML string */
function renderSectionHtml(section: WebPageSection): string {
  const c = section.config;

  switch (section.section_type) {
    case "hero":
      return `<div style="position:relative;min-height:240px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:8px">
        ${c.image_url ? `<img src="${c.image_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>` : ""}
        <div style="position:absolute;inset:0;background:#000;opacity:${c.overlay_opacity ?? 0.5}"></div>
        <div style="position:relative;z-index:1;text-align:center;padding:32px;color:#fff">
          ${c.heading ? `<h2 style="font-size:2rem;font-weight:700;margin:0 0 8px">${esc(c.heading)}</h2>` : ""}
          ${c.subheading ? `<p style="font-size:1.1rem;opacity:.85;margin:0 0 16px">${esc(c.subheading)}</p>` : ""}
          ${c.cta_text ? `<a href="${esc(c.cta_url || "#")}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">${esc(c.cta_text)}</a>` : ""}
        </div>
      </div>`;

    case "text_block":
      return `<div style="padding:24px 16px;text-align:${c.alignment || "left"}">
        ${c.heading ? `<h3 style="font-size:1.5rem;font-weight:700;margin:0 0 12px">${esc(c.heading)}</h3>` : ""}
        ${c.body ? `<div style="line-height:1.7">${esc(c.body).replace(/\n/g, "<br/>")}</div>` : ""}
      </div>`;

    case "image_gallery": {
      const items = (c.items || []) as { image_url: string; caption?: string }[];
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px">
        ${items.map((item) => `<div>
          <img src="${esc(item.image_url)}" alt="${esc(item.caption || "")}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px"/>
          ${item.caption ? `<p style="text-align:center;font-size:.75rem;color:#888;margin:4px 0 0">${esc(item.caption)}</p>` : ""}
        </div>`).join("")}
      </div>`;
    }

    case "cta":
      return `<div style="padding:32px;text-align:center;border-radius:8px;background:${c.background_color || "#f0f0ff"}">
        ${c.image_url ? `<img src="${c.image_url}" alt="" style="height:64px;margin:0 auto 16px;object-fit:contain"/>` : ""}
        ${c.heading ? `<h3 style="font-size:1.5rem;font-weight:700;margin:0 0 8px">${esc(c.heading)}</h3>` : ""}
        ${c.body ? `<p style="color:#666;margin:0 0 16px">${esc(c.body)}</p>` : ""}
        ${c.button_text ? `<a href="${esc(c.button_url || "#")}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">${esc(c.button_text)}</a>` : ""}
      </div>`;

    case "embed_widget":
      return `<div style="padding:16px">
        ${c.label ? `<p style="font-size:.85rem;color:#888;margin:0 0 8px">${esc(c.label)}</p>` : ""}
        ${c.embed_code || ""}
      </div>`;

    case "banner":
      return c.image_url
        ? `<div style="padding:16px"><a href="${esc(c.link_url || "#")}"><img src="${esc(c.image_url)}" alt="${esc(c.alt_text || "")}" style="width:100%;border-radius:8px;object-fit:cover;max-height:200px"/></a></div>`
        : "";

    case "video":
      return `<div style="padding:16px">
        ${c.video_url ? `<div style="aspect-ratio:16/9;border-radius:8px;overflow:hidden"><iframe src="${esc(c.video_url)}" style="width:100%;height:100%;border:0" allowfullscreen></iframe></div>` : ""}
        ${c.caption ? `<p style="text-align:center;font-size:.85rem;color:#888;margin:8px 0 0">${esc(c.caption)}</p>` : ""}
      </div>`;

    case "featured_events":
      return `<div style="padding:16px;text-align:center;border:2px dashed #ddd;border-radius:8px;color:#888">
        <p style="font-size:.9rem;font-weight:600;margin:0 0 4px">Featured Events</p>
        <p style="font-size:.8rem">This section displays live data and cannot be fully exported to static HTML.<br/>Visit the page online to see featured events.</p>
      </div>`;

    default:
      return "";
  }
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function exportPageAsHtml(title: string, sections: WebPageSection[], tenantName?: string): void {
  const body = sections.map(renderSectionHtml).join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)}${tenantName ? ` — ${esc(tenantName)}` : ""}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;background:#fff;line-height:1.5}
    img{max-width:100%;display:block}
    .container{max-width:960px;margin:0 auto}
  </style>
</head>
<body>
  <div class="container">
${body}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
