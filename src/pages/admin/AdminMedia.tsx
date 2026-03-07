import { useEffect, useState } from "react";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import MediaUploader from "@/components/media/MediaUploader";
import MediaGrid from "@/components/media/MediaGrid";
import AIImageGenerator from "@/components/media/AIImageGenerator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image, Search, Save, Loader2, Video, RefreshCw } from "lucide-react";
import AddEmbedDialog from "@/components/media/AddEmbedDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import PageAppearanceManager from "@/components/admin/PageAppearanceManager";

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const TABS = ["all", "games", "tournament", "badge", "trophy", "banner", "general", "challenges", "marketing", "widget"];

const AdminMedia = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { media, isLoading, upload, isUploading, deleteMedia, isDeleting, bulkDelete, isBulkDeleting, generateImage, isGenerating, updateCategory } = useMediaLibrary(activeTab);

  const handleSyncGameImages = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: games } = await supabase
        .from("games")
        .select("name, cover_image_url")
        .not("cover_image_url", "is", null);

      const { data: existingMedia } = await supabase
        .from("media_library")
        .select("url")
        .eq("category", "games");

      const existingUrls = new Set((existingMedia ?? []).map((m: any) => m.url));
      const missing = (games ?? []).filter((g: any) => g.cover_image_url && !existingUrls.has(g.cover_image_url));

      if (missing.length === 0) {
        toast.info("All game images are already synced.");
        setSyncing(false);
        return;
      }

      const rows = missing.map((g: any) => {
        const decoded = decodeURIComponent(g.cover_image_url);
        const pathMatch = decoded.match(/app-media\/(.+)$/);
        const filePath = pathMatch ? pathMatch[1] : `games/${g.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
        const fileName = filePath.split("/").pop() ?? "unknown.jpg";

        return {
          user_id: user.id,
          file_name: fileName,
          file_path: filePath,
          file_type: "image",
          mime_type: "image/jpeg",
          url: g.cover_image_url,
          category: "games",
          tags: ["game-cover", g.name],
        };
      });

      const { error } = await supabase.from("media_library").insert(rows as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      toast.success(`Synced ${rows.length} game images to media library`);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "featured_video_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setVideoUrl(data.value);
        setLoadingVideo(false);
      });
  }, []);

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: videoUrl })
      .eq("key", "featured_video_url");
    if (error) {
      toast.error(error.message || "Failed to save video URL");
    } else {
      toast.success("Featured video URL updated.");
    }
    setSavingVideo(false);
  };

  const filtered = search
    ? media.filter((m) => m.file_name.toLowerCase().includes(search.toLowerCase()) || m.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    : media;

  const youtubeId = extractYouTubeId(videoUrl);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Image className="h-8 w-8 text-primary" />
            Media Library
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Manage images, videos, and audio across your application</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncGameImages} disabled={syncing} className="font-heading gap-2 border-primary/30 text-primary hover:bg-primary/10">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Game Images
          </Button>
          <AIImageGenerator onGenerate={generateImage} isGenerating={isGenerating} />
          <AddEmbedDialog />
        </div>
      </div>

      {/* Featured Video Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Featured Video
          </CardTitle>
          <CardDescription className="font-body">
            YouTube video shown on the home page. Paste a youtu.be or youtube.com link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {youtubeId && (
              <div className="w-full md:w-64 shrink-0 rounded-md overflow-hidden border border-border">
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title="Featured Video Preview"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </AspectRatio>
              </div>
            )}
            <div className="flex-1 space-y-3">
              {loadingVideo ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="bg-background border-border font-body"
                />
              )}
              <Button onClick={handleSaveVideo} disabled={savingVideo || loadingVideo} className="font-heading">
                {savingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Video URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PageAppearanceManager />

      <MediaUploader onUpload={upload} isUploading={isUploading} />

      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="bg-muted">
              {TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="capitalize font-heading text-sm">{tab}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search media..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-card border-border font-body" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <MediaGrid media={filtered} onDelete={deleteMedia} isDeleting={isDeleting} onUpdateCategory={updateCategory} onBulkDelete={bulkDelete} isBulkDeleting={isBulkDeleting} />
        )}
      </div>
    </div>
  );
};

export default AdminMedia;
