import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PageHeroImage {
  id: string;
  page_slug: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  updated_at: string;
  created_at: string;
}

export const usePageHero = (pageSlug: string) => {
  return useQuery({
    queryKey: ["page-hero", pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_hero_images" as any)
        .select("*")
        .eq("page_slug", pageSlug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PageHeroImage | null;
    },
  });
};

export const useAllPageHeroes = () => {
  return useQuery({
    queryKey: ["page-heroes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_hero_images" as any)
        .select("*")
        .order("page_slug");
      if (error) throw error;
      return (data ?? []) as unknown as PageHeroImage[];
    },
  });
};

export const useUpsertPageHero = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hero: { page_slug: string; image_url: string; title?: string | null; subtitle?: string | null }) => {
      const { error } = await (supabase.from("page_hero_images" as any) as any).upsert(
        {
          page_slug: hero.page_slug,
          image_url: hero.image_url,
          title: hero.title ?? null,
          subtitle: hero.subtitle ?? null,
        },
        { onConflict: "page_slug" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hero image saved");
      queryClient.invalidateQueries({ queryKey: ["page-hero"] });
      queryClient.invalidateQueries({ queryKey: ["page-heroes-all"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save hero image"),
  });
};
