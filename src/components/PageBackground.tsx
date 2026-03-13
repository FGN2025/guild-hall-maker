import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageBackground } from "@/hooks/usePageBackground";

interface PageBackgroundProps {
  pageSlug: string;
}

const PageBackground = ({ pageSlug }: PageBackgroundProps) => {
  const { data: bg } = usePageBackground(pageSlug);

  // Fallback: fetch banner images from media library when no configured background
  const { data: banners } = useQuery({
    queryKey: ["media-banners-fallback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_library")
        .select("url")
        .eq("category", "banner")
        .eq("file_type", "image")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d) => d.url);
    },
    enabled: !bg,
    staleTime: 5 * 60 * 1000,
  });

  // Deterministic hash to pick a different banner per page
  const pickBanner = (slug: string, list: string[]) => {
    if (!list.length) return null;
    const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return list[hash % list.length];
  };

  const imageUrl = bg?.image_url ?? (banners ? pickBanner(pageSlug, banners) : null);
  const opacity = bg?.opacity ?? 0.65;

  if (!imageUrl) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover"
        style={{ opacity }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/90" />
    </div>
  );
};

export default PageBackground;
