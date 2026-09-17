import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HubChallenge {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  points_first: number | null;
  estimated_minutes: number | null;
  cover_image_url: string | null;
  display_order: number | null;
  game_id: string | null;
  games: {
    name: string | null;
    slug: string | null;
    category: string | null;
    cover_image_url: string | null;
    description: string | null;
    platform_tags: string[] | null;
  } | null;
  [key: string]: any;
}

export interface HubGame {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  platformTags: string[];
  coverImageUrl: string | null;
  challenges: HubChallenge[];
  total: number;
  completed: number;
}

/** All active challenges with their game, grouped into per-game "communities". */
export const useChallengeHub = () => {
  const { user } = useAuth();

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["player-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "*, games(name, slug, category, cover_image_url, description, platform_tags)"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HubChallenge[];
    },
  });

  const { data: myEnrollments = [] } = useQuery({
    queryKey: ["my-challenge-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_enrollments")
        .select("challenge_id, status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  /** challenge_id -> pathway for the merit it belongs to. */
  const { data: challengePathways = {} } = useQuery({
    queryKey: ["challenge-pathway-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merit_challenges")
        .select("challenge_id, merits(pathway_id, merit_pathways(slug, name))");
      if (error) throw error;
      const map: Record<string, { slug: string; name: string }> = {};
      (data ?? []).forEach((row: any) => {
        const p = row.merits?.merit_pathways;
        if (p && row.challenge_id) map[row.challenge_id] = { slug: p.slug, name: p.name };
      });
      return map;
    },
  });

  const completedIds = new Set(
    (myEnrollments as any[]).filter((e) => e.status === "completed").map((e) => e.challenge_id)
  );
  const enrolledIds = new Set((myEnrollments as any[]).map((e) => e.challenge_id));

  /** Competitive gaming challenges live in their own card, not per-game. */
  const competitive = challenges.filter((c: any) => c.track === "competitive_gaming");
  const competitiveCompleted = competitive.filter((c) => completedIds.has(c.id)).length;

  const byGame = new Map<string, HubGame>();
  challenges.forEach((c: any) => {
    if (c.track === "competitive_gaming") return;
    const g = c.games;
    const slug = g?.slug;
    if (!slug) return;
    if (!byGame.has(slug)) {
      byGame.set(slug, {
        slug,
        name: g?.name ?? slug,
        category: g?.category ?? "General",
        description: g?.description ?? null,
        platformTags: g?.platform_tags ?? [],
        coverImageUrl: g?.cover_image_url ?? null,
        challenges: [],
        total: 0,
        completed: 0,
        pathway: null,
      });
    }
    const entry = byGame.get(slug)!;
    entry.challenges.push(c);
    entry.total += 1;
    if (completedIds.has(c.id)) entry.completed += 1;
    if (!entry.pathway && (challengePathways as any)[c.id]) {
      entry.pathway = (challengePathways as any)[c.id];
    }
  });

  const games = [...byGame.values()].sort((a, b) => b.total - a.total);

  return {
    games,
    challenges,
    competitive,
    competitiveCompleted,
    completedIds,
    enrolledIds,
    isLoading,
  };
};
