import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PageBackground {
  id: string;
  page_slug: string;
  image_url: string;
  opacity: number;
  updated_at: string;
  created_at: string;
}

export const usePageBackground = (pageSlug: string) => {
  return useQuery({
    queryKey: ["page-background", pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_backgrounds" as any)
        .select("*")
        .eq("page_slug", pageSlug)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PageBackground | null;
    },
  });
};

export const useAllPageBackgrounds = () => {
  return useQuery({
    queryKey: ["page-backgrounds-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_backgrounds" as any)
        .select("*")
        .order("page_slug");
      if (error) throw error;
      return (data ?? []) as unknown as PageBackground[];
    },
  });
};

export const useUpsertPageBackground = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bg: { page_slug: string; image_url: string; opacity?: number }) => {
      const { error } = await (supabase.from("page_backgrounds" as any) as any).upsert(
        {
          page_slug: bg.page_slug,
          image_url: bg.image_url,
          opacity: bg.opacity ?? 0.50,
        },
        { onConflict: "page_slug" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Background saved");
      queryClient.invalidateQueries({ queryKey: ["page-background"] });
      queryClient.invalidateQueries({ queryKey: ["page-backgrounds-all"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save background"),
  });
};

export const useDeletePageBackground = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pageSlug: string) => {
      const { error } = await (supabase.from("page_backgrounds" as any) as any)
        .delete()
        .eq("page_slug", pageSlug);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Background cleared");
      queryClient.invalidateQueries({ queryKey: ["page-background"] });
      queryClient.invalidateQueries({ queryKey: ["page-backgrounds-all"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to clear background"),
  });
};
