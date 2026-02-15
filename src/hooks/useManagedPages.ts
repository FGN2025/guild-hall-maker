import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManagedPage {
  id: string;
  slug: string;
  label: string;
  supports_hero: boolean;
  supports_background: boolean;
  display_order: number;
  created_at: string;
}

export const useAllManagedPages = () => {
  return useQuery({
    queryKey: ["managed-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("managed_pages" as any)
        .select("*")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as unknown as ManagedPage[];
    },
  });
};

export const useAddManagedPage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: { slug: string; label: string; supports_hero: boolean; supports_background: boolean }) => {
      const { error } = await (supabase.from("managed_pages" as any) as any).insert({
        slug: page.slug,
        label: page.label,
        supports_hero: page.supports_hero,
        supports_background: page.supports_background,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page added");
      qc.invalidateQueries({ queryKey: ["managed-pages"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add page"),
  });
};

export const useDeleteManagedPage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("managed_pages" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page removed");
      qc.invalidateQueries({ queryKey: ["managed-pages"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove page"),
  });
};
