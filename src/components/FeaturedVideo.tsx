import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const FeaturedVideo = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "featured_video_url")
        .maybeSingle();
      if (data?.value) {
        setVideoId(extractYouTubeId(data.value));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Skeleton className="w-48 h-6 mb-6" />
          <Skeleton className="w-full aspect-video rounded-xl" />
        </div>
      </section>
    );
  }

  if (!videoId) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <p className="font-display text-xs tracking-[0.3em] text-primary uppercase mb-2">
          Watch Now
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
          Featured Video
        </h2>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <AspectRatio ratio={16 / 9}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Featured Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </AspectRatio>
        </div>
      </div>
    </section>
  );
};

export default FeaturedVideo;
