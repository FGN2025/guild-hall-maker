// Maps top-trafficked routes to their lazy-imported page modules.
// Calling the loader on hover/focus warms the browser cache so the
// subsequent click resolves instantly instead of waiting for a fresh
// network round-trip after the user commits to navigation.
const loaders: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/tournaments": () => import("@/pages/Tournaments"),
  "/leaderboard": () => import("@/pages/Leaderboard"),
  "/challenges": () => import("@/pages/Challenges"),
  "/quests": () => import("@/pages/Quests"),
  "/prize-shop": () => import("@/pages/PrizeShop"),
  "/calendar": () => import("@/pages/TournamentCalendar"),
  "/games": () => import("@/pages/Games"),
  "/community": () => import("@/pages/Community"),
  "/season-stats": () => import("@/pages/SeasonStats"),
  "/compare": () => import("@/pages/PlayerComparison"),
  "/achievements": () => import("@/pages/Achievements"),
  "/ladders": () => import("@/pages/Ladders"),
  "/profile": () => import("@/pages/ProfileSettings"),
};

const prefetched = new Set<string>();

export const prefetchRoute = (path: string) => {
  if (prefetched.has(path)) return;
  const loader = loaders[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire and forget — failures are harmless; the real navigation will retry.
  loader().catch(() => prefetched.delete(path));
};
