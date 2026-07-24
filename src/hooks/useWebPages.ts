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
  is_tenant_banner?: boolean;
  publish_at?: string | null;
  unpublish_at?: string | null;
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

export interface WebPageTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  sections: Array<{ section_type: string; config: Record<string, any> }>;
  is_universal: boolean;
}

/** Grouped by intent for the marketer-friendly Add Section picker. */
export const SECTION_GROUPS = [
  {
    label: "Hero & Above-the-fold",
    description: "Grab attention at the top of the page",
    types: ["hero", "banner"],
  },
  {
    label: "Content & Story",
    description: "Tell the story of your service",
    types: ["text_block", "image_gallery", "video"],
  },
  {
    label: "Conversion",
    description: "Drive sign-ups, contact, or clicks",
    types: ["cta"],
  },
  {
    label: "Live Data & Community",
    description: "Pull in real activity from the platform",
    types: ["featured_events"],
  },
  {
    label: "Embeds",
    description: "Drop in third-party widgets or custom HTML",
    types: ["embed_widget"],
  },
] as const;

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
      qc.invalidateQueries({ queryKey: ["user-tenant-branding"] });
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

  const createFromTemplate = useMutation({
    mutationFn: async (input: {
      template_id: string;
      title: string;
      slug: string;
      description?: string;
      tenant_id?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: tpl, error: tplErr } = await (supabase.from("web_page_templates") as any)
        .select("sections")
        .eq("id", input.template_id)
        .single();
      if (tplErr) throw tplErr;

      const { data: page, error: pageErr } = await supabase
        .from("web_pages")
        .insert({
          title: input.title,
          slug: input.slug,
          description: input.description ?? null,
          tenant_id: input.tenant_id ?? null,
          created_by: user.id,
        } as any)
        .select()
        .single();
      if (pageErr) throw pageErr;

      const sections = (tpl?.sections ?? []) as Array<{ section_type: string; config: Record<string, any> }>;
      if (sections.length) {
        const rows = sections.map((s, i) => ({
          page_id: (page as any).id,
          section_type: s.section_type,
          display_order: i,
          config: s.config ?? {},
        }));
        const { error: secErr } = await supabase.from("web_page_sections").insert(rows as any);
        if (secErr) throw secErr;
      }
      return page as unknown as WebPage;
    },
    onSuccess: () => {
      toast.success("Page created from template");
      qc.invalidateQueries({ queryKey: ["web-pages"] });
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
    createFromTemplate,
  };
};

/** Curated + universal starting points, readable by anyone. */
export const usePageTemplates = () =>
  useQuery({
    queryKey: ["web-page-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("web_page_templates") as any)
        .select("id, name, description, category, preview_image_url, sections, is_universal")
        .order("category", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WebPageTemplate[];
    },
    staleTime: 5 * 60_000,
  });
