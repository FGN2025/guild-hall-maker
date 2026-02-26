import { useParams, useNavigate } from "react-router-dom";
import { useMarketingCampaigns, useMarketingAssets } from "@/hooks/useMarketingCampaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TenantMarketingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, isLoading: loadingCampaigns } = useMarketingCampaigns(true);
  const { assets, isLoading: loadingAssets } = useMarketingAssets(id);
  const [copied, setCopied] = useState(false);

  const campaign = campaigns.find((c) => c.id === id);

  if (loadingCampaigns) {
    return <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!campaign) {
    return <div className="p-6 text-center text-muted-foreground">Campaign not found.</div>;
  }

  const handleCopy = () => {
    if (campaign.social_copy) {
      navigator.clipboard.writeText(campaign.social_copy);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${campaign.title.replace(/\s+/g, "-")}-${label}.${blob.type.split("/")[1] || "png"}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/tenant/marketing")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Library
      </Button>

      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">{campaign.title}</h1>
        <Badge variant="outline" className="mt-2 capitalize">{campaign.category.replace("_", " ")}</Badge>
        {campaign.description && <p className="text-muted-foreground mt-3">{campaign.description}</p>}
      </div>

      {campaign.social_copy && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-heading mb-2">Suggested Social Copy</p>
                <p className="text-sm whitespace-pre-wrap">{campaign.social_copy}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Asset Variants</h2>
        {loadingAssets ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets available for this campaign.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assets.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <img src={a.url} alt={a.label} className="w-full h-48 object-cover" />
                <CardContent className="pt-4 flex items-center justify-between">
                  <Badge variant="secondary">{a.label}</Badge>
                  <Button size="sm" onClick={() => handleDownload(a.url, a.label)}>
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantMarketingDetail;
