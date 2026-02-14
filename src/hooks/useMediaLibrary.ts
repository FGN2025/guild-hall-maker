import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MediaItem {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  url: string;
  category: string;
  tags: string[];
  created_at: string;
}

export const useMediaLibrary = (category?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mediaQuery = useQuery({
    queryKey: ["media-library", category],
    queryFn: async () => {
      let query = supabase.from("media_library").select("*").order("created_at", { ascending: false });
      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as MediaItem[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category: cat = "general", tags = [] }: { file: File; category?: string; tags?: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() ?? "bin";
      const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const filePath = `${cat}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("app-media").upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(filePath);

      let fileType: string = "image";
      if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "audio";

      const { error: insertError } = await supabase.from("media_library").insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        url: urlData.publicUrl,
        category: cat,
        tags,
      } as any);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("File uploaded!");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: (err: Error) => toast.error(err.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: MediaItem) => {
      const { error: storageErr } = await supabase.storage.from("app-media").remove([item.file_path]);
      if (storageErr) console.warn("Storage delete warning:", storageErr);
      const { error } = await supabase.from("media_library").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Media deleted");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const generateMutation = useMutation({
    mutationFn: async ({ prompt, category: cat = "general", tags = [] }: { prompt: string; category?: string; tags?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("generate-media-image", {
        body: { prompt, category: cat, tags },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.media as MediaItem;
    },
    onSuccess: () => {
      toast.success("Image generated!");
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
    },
    onError: (err: Error) => toast.error(err.message || "Generation failed"),
  });

  return {
    media: mediaQuery.data ?? [],
    isLoading: mediaQuery.isLoading,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteMedia: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    generateImage: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
  };
};
