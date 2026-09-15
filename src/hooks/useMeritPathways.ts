import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MeritChallengeLink {
  id: string;
  challenge_id: string;
  sequence_order: number;
  is_required: boolean;
  challenge: {
    id: string;
    name: string;
    cover_image_url: string | null;
    difficulty: string | null;
    games: { name: string | null; cover_image_url: string | null } | null;
  } | null;
}

export interface MeritWithProgress {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  level: string;
  icon: string | null;
  skills: string[];
  academy_next_step: string | null;
  display_order: number;
  pathway_id: string;
  challenges: MeritChallengeLink[];
  completedCount: number;
  totalCount: number;
}

export interface PathwayWithMerits {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  merits: MeritWithProgress[];
  completedCount: number;
  totalCount: number;
}

export const useMeritPathways = () => {
  const { user } = useAuth();

  const { data: pathways = [], isLoading: pathwaysLoading } = useQuery({
    queryKey: ["merit-pathways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merit_pathways")
        .select("id, slug, name, description, icon, display_order")
        .eq("is_published", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: merits = [], isLoading: meritsLoading } = useQuery({
    queryKey: ["merits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merits")
        .select("id, pathway_id, slug, name, description, level, icon, skills, academy_next_step, display_order")
        .eq("is_published", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["merit-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merit_challenges")
        .select(
          "id, merit_id, challenge_id, is_required, sequence_order, challenges(id, name, cover_image_url, difficulty, games(name, cover_image_url))"
        )
        .order("sequence_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["my-challenge-completions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_completions")
        .select("challenge_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set((completions as any[]).map((c) => c.challenge_id));

  const meritsWithProgress: MeritWithProgress[] = (merits as any[]).map((m) => {
    const meritLinks = (links as any[])
      .filter((l) => l.merit_id === m.id)
      .map((l) => ({
        id: l.id,
        challenge_id: l.challenge_id,
        sequence_order: l.sequence_order,
        is_required: l.is_required,
        challenge: l.challenges ?? null,
      }));
    return {
      ...m,
      skills: m.skills ?? [],
      challenges: meritLinks,
      totalCount: meritLinks.length,
      completedCount: meritLinks.filter((l) => completedIds.has(l.challenge_id)).length,
    };
  });

  const pathwaysWithMerits: PathwayWithMerits[] = (pathways as any[]).map((p) => {
    const own = meritsWithProgress.filter((m) => m.pathway_id === p.id);
    return {
      ...p,
      merits: own,
      totalCount: own.reduce((s, m) => s + m.totalCount, 0),
      completedCount: own.reduce((s, m) => s + m.completedCount, 0),
    };
  });

  return {
    pathways: pathwaysWithMerits,
    merits: meritsWithProgress,
    isLoading: pathwaysLoading || meritsLoading,
  };
};

export interface BadgeRequirement {
  id: string;
  requirement_number: string;
  requirement_text: string;
  version_year: number;
  source_url: string | null;
  action_verbs: string[];
  requires_in_person: boolean;
  safety_note: string | null;
}

export const useOfficialBadge = (slug: string | undefined) => {
  const { user } = useAuth();

  const { data: badge } = useQuery({
    queryKey: ["official-badge", slug],
    enabled: !!slug && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("official_badges")
        .select("id, slug, name, organization_kind, source_url, special_conditions_note")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["badge-requirements", badge?.id],
    enabled: !!badge?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_requirements")
        .select(
          "id, requirement_number, requirement_text, version_year, source_url, action_verbs, requires_in_person, safety_note"
        )
        .eq("badge_id", badge!.id)
        .eq("is_retired", false);
      if (error) throw error;
      return (data ?? []) as BadgeRequirement[];
    },
  });

  const sorted = [...requirements].sort((a, b) => {
    const pa = parseInt(a.requirement_number, 10);
    const pb = parseInt(b.requirement_number, 10);
    if (pa !== pb) return pa - pb;
    return a.requirement_number.localeCompare(b.requirement_number);
  });

  return { badge, requirements: sorted };
};
