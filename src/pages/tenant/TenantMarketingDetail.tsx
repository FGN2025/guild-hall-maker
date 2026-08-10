import { useParams, useNavigate } from "react-router-dom";
import { useMarketingCampaigns, useMarketingAssets } from "@/hooks/useMarketingCampaigns";
import { useTenantMarketingAssets } from "@/hooks/useTenantMarketingAssets";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Copy, Check, BookmarkPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import AssetEditorDialog from "@/components/media/AssetEditorDialog";
import { derivePromoArgs, beatLabelFromOverlays } from "@/lib/promo/derivePromoArgs";
import CampaignCodeLinker from "@/components/tenant/CampaignCodeLinker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import CampaignStatusBadge, { resolveCampaignStatus } from "@/components/marketing/CampaignStatusBadge";


const TenantMarketingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Not published-only — tenant staff open their own pending-review drafts here.
  const { campaigns, isLoading: loadingCampaigns } = useMarketingCampaigns(false);

  const { assets, isLoading: loadingAssets, deleteAsset } = useMarketingAssets(id);
  const { assets: tenantAssets, saveFromLibrary, uploadAsset } = useTenantMarketingAssets();
  const composedPromos = tenantAssets.filter((a) => a.campaign_id === id);
  const { tenantInfo } = useTenantAdmin();
  const [copied, setCopied] = useState(false);
  const [editorAssetUrl, setEditorAssetUrl] = useState<string | null>(null);
  const [editorAssetMeta, setEditorAssetMeta] = useState<{ id: string; label: string } | null>(null);
  /** Composer/editor layers for the asset being customized (null for plain library art). */
  const [editorOverlayConfig, setEditorOverlayConfig] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; file_path: string; label: string } | null>(null);
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CampaignStatusBadge status={resolveCampaignStatus(campaign)} />
          <Badge variant="outline" className="capitalize">{campaign.category.replace("_", " ")}</Badge>
        </div>
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

      {/* Promo Codes linked to this campaign */}
      {tenantInfo && campaign && (
        <Card>
          <CardContent className="pt-6">
            <CampaignCodeLinker
              campaignId={campaign.id}
              campaignTitle={campaign.title}
              tenantId={tenantInfo.tenantId}
              readOnly={tenantInfo.tenantRole === "manager"}
            />
          </CardContent>
        </Card>
      )}

      {/* TD-001 repair: the composer writes to `tenant_marketing_assets`, so the
          variants panel reads that table first and falls back to any legacy
          `marketing_assets` rows (older platform-authored campaigns). */}
      <div>
        <h2 className="font-heading text-lg font-semibold mb-1">Asset Variants</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Art attached to this campaign, including graphics composed by the marketing agent.
        </p>
        {loadingAssets ? (
          <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : composedPromos.length === 0 && assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets available for this campaign.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {composedPromos.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <img src={a.url} alt={a.label} className="w-full h-48 object-cover" loading="lazy" />
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{a.label}</Badge>
                    {a.agent_source && <Badge variant="outline">Agent</Badge>}
                    {!a.is_published && <Badge variant="outline">Draft</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        // Open on the TEXT-FREE plate with the composed copy
                        // rehydrated as live layers — editing the flat PNG
                        // bakes the headline in and it gets cropped, not
                        // reflowed, when the reviewer switches format.
                        setEditorAssetUrl((a as any).background_url ?? a.url);
                        setEditorAssetMeta({ id: a.source_asset_id ?? a.id, label: a.label });
                        const cfg = ((a as any).overlay_config as Record<string, any>) ?? null;
                        setEditorOverlayConfig(cfg);
                        // Legacy assets have no persisted composer inputs; rebuild
                        // them from the campaign's event so format switches can
                        // re-layout rather than merely rescale.
                        if (cfg && !cfg.promo) {
                          const promo = await derivePromoArgs({
                            tenantId: tenantInfo?.tenantId,
                            sourceEventId: campaign.source_event_id,
                            sourceTournamentId: campaign.source_tournament_id,
                            beatLabel: beatLabelFromOverlays(cfg.overlays),
                          });
                          if (promo) setEditorOverlayConfig({ ...cfg, promo });
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Customize
                    </Button>

                    <Button size="sm" onClick={() => handleDownload(a.url, a.label)}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assets.map((a) => (
              <Card key={a.id} className="overflow-hidden">
                <img src={a.url} alt={a.label} className="w-full h-48 object-cover" loading="lazy" />
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{a.label}</Badge>
                    <Badge variant="outline">Library</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditorAssetUrl(a.url);
                        setEditorAssetMeta({ id: a.id, label: a.label });
                        setEditorOverlayConfig(null);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Customize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        saveFromLibrary.mutate({
                          sourceAssetId: a.id,
                          campaignId: campaign.id,
                          url: a.url,
                          label: a.label,
                          filePath: a.file_path,
                        })
                      }
                      disabled={saveFromLibrary.isPending}
                    >
                      <BookmarkPlus className="h-4 w-4 mr-2" /> Save
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(a.url, a.label)}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: a.id, file_path: a.file_path, label: a.label })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


      {editorAssetUrl && editorAssetMeta && (
        <AssetEditorDialog
          open={!!editorAssetUrl}
          onOpenChange={(open) => { if (!open) { setEditorAssetUrl(null); setEditorAssetMeta(null); setEditorOverlayConfig(null); } }}
          baseImageUrl={editorAssetUrl}
          initialOverlayConfig={editorOverlayConfig as any}
          onSave={async (blob, meta) => {
            const file = new File([blob], `customized-${Date.now()}.png`, { type: "image/png" });
            await uploadAsset.mutateAsync({
              file,
              label: `${editorAssetMeta.label} (customized)`,
              sourceAssetId: editorAssetMeta.id,
              campaignId: campaign.id,
              overlayConfig: meta?.overlayConfig ?? null,
              backgroundUrl: meta?.backgroundUrl ?? null,
            });
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Asset Variant"
        description={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteAsset.mutate({ id: deleteTarget.id, file_path: deleteTarget.file_path });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};

export default TenantMarketingDetail;
