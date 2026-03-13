import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WebPage {
  id: string;
  tenant_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebPageSection {
  id: string;
  page_id: string;
  section_type: string;
  display_order: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const SECTION_TYPES = [
  { value: "hero", label: "Hero Banner", description: "Large hero image with heading and CTA" },
  { value: "text_block", label: "Text Block", description: "Rich text content section" },
  { value: "image_gallery", label: "Image Gallery", description: "Grid of images with captions" },
  { value: "cta", label: "Call to Action", description: "CTA block with button and background" },
  { value: "embed_widget", label: "Embed Widget", description: "Embedded HTML widget" },
  { value: "banner", label: "Banner", description: "Full-width banner image with optional link" },
  { value: "video", label: "Video", description: "Embedded video with caption" },
  { value: "featured_events", label: "Featured Events", description: "Live grid of featured tournaments, challenges & quests" },
] as const;

export const useWebPages = (tenantId?: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: ["web-pages", tenantId],
    queryFn: async () => {
      let q = supabase.from("web_pages").select("*").order("updated_at", { ascending: false });
      if (tenantId !== undefined) {
        if (tenantId === null) q = q.is("tenant_id", null);
        else q = q.eq("tenant_id", tenantId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WebPage[];
    },
  });

  const sectionsQuery = (pageId: string) =>
    useQuery({
      queryKey: ["web-page-sections", pageId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("web_page_sections")
          .select("*")
          .eq("page_id", pageId)
          .order("display_order", { ascending: true });
        if (error) throw error;
        return (data ?? []) as unknown as WebPageSection[];
      },
      enabled: !!pageId,
    });

  const createPage = useMutation({
    mutationFn: async (input: { title: string; slug: string; description?: string; tenant_id?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("web_pages")
        .insert({ ...input, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WebPage;
    },
    onSuccess: () => {
      toast.success("Page created");
      qc.invalidateQueries({ queryKey: ["web-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebPage> & { id: string }) => {
      const { error } = await supabase.from("web_pages").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page updated");
      qc.invalidateQueries({ queryKey: ["web-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("web_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page deleted");
      qc.invalidateQueries({ queryKey: ["web-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSection = useMutation({
    mutationFn: async (input: { page_id: string; section_type: string; display_order: number; config?: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("web_page_sections")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WebPageSection;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["web-page-sections", vars.page_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, page_id, ...updates }: Partial<WebPageSection> & { id: string; page_id: string }) => {
      const { error } = await supabase.from("web_page_sections").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["web-page-sections", vars.page_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSection = useMutation({
    mutationFn: async ({ id, page_id }: { id: string; page_id: string }) => {
      const { error } = await supabase.from("web_page_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["web-page-sections", vars.page_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderSections = useMutation({
    mutationFn: async ({ page_id, orderedIds }: { page_id: string; orderedIds: string[] }) => {
      const updates = orderedIds.map((id, i) =>
        supabase.from("web_page_sections").update({ display_order: i } as any).eq("id", id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["web-page-sections", vars.page_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    pages: pagesQuery.data ?? [],
    isLoadingPages: pagesQuery.isLoading,
    useSections: sectionsQuery,
    createPage,
    updatePage,
    deletePage,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
  };
};
