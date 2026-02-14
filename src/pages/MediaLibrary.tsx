import { useState } from "react";

import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import MediaUploader from "@/components/media/MediaUploader";
import MediaGrid from "@/components/media/MediaGrid";
import AIImageGenerator from "@/components/media/AIImageGenerator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Image, Search } from "lucide-react";

const TABS = ["all", "tournament", "badge", "trophy", "banner", "general"];

const MediaLibrary = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const { media, isLoading, upload, isUploading, deleteMedia, isDeleting, generateImage, isGenerating } = useMediaLibrary(activeTab);

  const filtered = search
    ? media.filter((m) => m.file_name.toLowerCase().includes(search.toLowerCase()) || m.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    : media;

  return (
    <div className="min-h-screen bg-background grid-bg">
      <div className="py-8 container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <Image className="h-8 w-8 text-primary" />
              Media Library
            </h1>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Manage images, videos, and audio across your application
            </p>
          </div>
          <AIImageGenerator onGenerate={generateImage} isGenerating={isGenerating} />
        </div>

        <MediaUploader onUpload={upload} isUploading={isUploading} />

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-muted">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="capitalize font-heading text-sm">
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border font-body"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <MediaGrid media={filtered} onDelete={deleteMedia} isDeleting={isDeleting} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
