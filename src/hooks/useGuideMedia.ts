import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface GuideMediaItem {
  id: string;
  guide_slug: string;
  section_id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export function useGuideMedia(guideSlug: string) {
  const queryClient = useQueryClient();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["guide-media", guideSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_media" as any)
        .select("*")
        .eq("guide_slug", guideSlug)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as GuideMediaItem[];
    },
  });

  const mediaBySection = useMemo(() => {
    const map: Record<string, GuideMediaItem[]> = {};
    for (const item of media) {
      if (!map[item.section_id]) map[item.section_id] = [];
      map[item.section_id].push(item);
    }
    return map;
  }, [media]);

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      sectionId,
      caption,
      fileType,
    }: {
      file: File;
      sectionId: string;
      caption?: string;
      fileType: "image" | "video" | "file";
    }) => {
      const ext = file.name.split(".").pop();
      const path = `guide-media/${guideSlug}/${sectionId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("app-media")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-media")
        .getPublicUrl(path);

      const maxOrder = media
        .filter((m) => m.section_id === sectionId)
        .reduce((max, m) => Math.max(max, m.sort_order), 0);

      const { error: insertError } = await supabase
        .from("guide_media" as any)
        .insert({
          guide_slug: guideSlug,
          section_id: sectionId,
          file_url: urlData.publicUrl,
          file_type: fileType,
          caption: caption || null,
          sort_order: maxOrder + 1,
        } as any);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-media", guideSlug] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guide_media" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guide-media", guideSlug] });
    },
  });

  return {
    media,
    mediaBySection,
    isLoading,
    uploadMedia: uploadMutation.mutateAsync,
    deleteMedia: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
