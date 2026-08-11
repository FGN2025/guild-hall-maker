/**
 * Generates public/sitemap.xml before `vite dev` and `vite build`.
 *
 * Static routes are listed inline; dynamic entries are pulled from the same
 * tables (and with the same visibility filters) the public route loaders use,
 * so the sitemap never advertises a page a crawler would be redirected away
 * from. Anonymous reads only — this uses the publishable key.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://play.fgn.gg";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Public, indexable routes only. Authenticated routes (/dashboard, /calendar,
// /leaderboard), admin/moderator/tenant areas, auth flows and the /embed/*
// iframe targets are deliberately excluded.
const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/tournaments", changefreq: "daily", priority: "0.9" },
  { path: "/challenges", changefreq: "weekly", priority: "0.8" },
  { path: "/quests", changefreq: "weekly", priority: "0.7" },
  { path: "/servers", changefreq: "weekly", priority: "0.6" },
  { path: "/for-providers", changefreq: "monthly", priority: "0.7" },
  { path: "/white-paper", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/acceptable-use", changefreq: "yearly", priority: "0.2" },
];

async function restSelect<T>(table: string, query: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    console.warn(
      `[sitemap] skipping ${table}: ${response.status} ${await response.text()}`,
    );
    return [];
  }

  return (await response.json()) as T[];
}

async function dynamicEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  // Tournaments: public detail pages, excluding archived rows.
  const tournaments = await restSelect<{ id: string; updated_at: string | null }>(
    "tournaments",
    "select=id,updated_at&archived_at=is.null&order=start_date.desc&limit=5000",
  );
  for (const row of tournaments) {
    entries.push({
      path: `/tournaments/${row.id}`,
      lastmod: row.updated_at ?? undefined,
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  // Tenant event hubs, one per active tenant.
  const tenants = await restSelect<{ slug: string; updated_at: string | null }>(
    "tenants",
    "select=slug,updated_at&status=eq.active&limit=1000",
  );
  const tenantById = new Map<string, string>();
  for (const row of tenants) {
    if (!row.slug) continue;
    entries.push({
      path: `/events/${row.slug}`,
      lastmod: row.updated_at ?? undefined,
      changefreq: "daily",
      priority: "0.7",
    });
  }

  // Tenant events: only rows the public route can actually render.
  const tenantRows = await restSelect<{ id: string; slug: string }>(
    "tenants",
    "select=id,slug&status=eq.active&limit=1000",
  );
  for (const row of tenantRows) {
    if (row.slug) tenantById.set(row.id, row.slug);
  }

  const events = await restSelect<{
    id: string;
    tenant_id: string;
    updated_at: string | null;
  }>(
    "tenant_events",
    "select=id,tenant_id,updated_at&is_public=is.true&order=start_date.desc&limit=5000",
  );
  for (const row of events) {
    const slug = tenantById.get(row.tenant_id);
    if (!slug) continue;
    entries.push({
      path: `/events/${slug}/${row.id}`,
      lastmod: row.updated_at ?? undefined,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  return entries;
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  let entries = [...staticEntries];

  try {
    entries = entries.concat(await dynamicEntries());
  } catch (error) {
    // Never fail the build over a sitemap: ship the static routes instead.
    console.warn("[sitemap] dynamic entries unavailable:", error);
  }

  writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main();
