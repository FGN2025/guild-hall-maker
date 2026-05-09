import { useEffect, useState } from "react";
import { Play } from "lucide-react";
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
  // Facade pattern — only mount the real iframe on user click.
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "featured_video_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setVideoId(extractYouTubeId(data.value));
        setLoading(false);
      });
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
            {activated ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="Featured Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActivated(true)}
                aria-label="Play featured video"
                className="group relative w-full h-full block bg-black"
              >
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                  alt="Featured video thumbnail"
                  loading="lazy"
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/90 text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-10 w-10 ml-1" fill="currentColor" />
                  </span>
                </span>
              </button>
            )}
          </AspectRatio>
        </div>
      </div>
    </section>
  );
};

export default FeaturedVideo;
