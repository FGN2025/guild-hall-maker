import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantAdmin } from "@/hooks/useTenantAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantMarketingAsset {
  id: string;
  tenant_id: string;
  source_asset_id: string | null;
  campaign_id: string | null;
  file_name: string;
  file_path: string;
  url: string;
  label: string;
  is_published: boolean;
  created_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useTenantMarketingAssets() {
  const { tenantInfo } = useTenantAdmin();
  const { user } = useAuth();
  const qc = useQueryClient();
  const tenantId = tenantInfo?.tenantId;
  const key = ["tenant_marketing_assets", tenantId];

  const assetsQuery = useQuery({
    queryKey: key,
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_marketing_assets" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as TenantMarketingAsset[];
    },
  });

  const uploadAsset = useMutation({
    mutationFn: async ({
      file,
      label,
      notes,
      sourceAssetId,
      campaignId,
    }: {
      file: File;
      label: string;
      notes?: string;
      sourceAssetId?: string;
      campaignId?: string;
    }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `tenant-marketing/${tenantId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("app-media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);

      const { error } = await supabase.from("tenant_marketing_assets" as any).insert({
        tenant_id: tenantId,
        file_name: file.name,
        file_path: path,
        url: urlData.publicUrl,
        label,
        notes: notes || null,
        source_asset_id: sourceAssetId || null,
        campaign_id: campaignId || null,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Asset uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveFromLibrary = useMutation({
    mutationFn: async ({
      sourceAssetId,
      campaignId,
      url,
      label,
      filePath,
    }: {
      sourceAssetId: string;
      campaignId?: string;
      url: string;
      label: string;
      filePath: string;
    }) => {
      if (!tenantId || !user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tenant_marketing_assets" as any).insert({
        tenant_id: tenantId,
        source_asset_id: sourceAssetId,
        campaign_id: campaignId || null,
        file_name: label,
        file_path: filePath,
        url,
        label,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Saved to My Assets");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("tenant_marketing_assets" as any)
        .update({ is_published } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAsset = useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path: string }) => {
      // Only try to delete from storage if it's our tenant path
      if (file_path.startsWith("tenant-marketing/")) {
        await supabase.storage.from("app-media").remove([file_path]);
      }
      const { error } = await supabase.from("tenant_marketing_assets" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Asset deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    assets: assetsQuery.data ?? [],
    isLoading: assetsQuery.isLoading,
    uploadAsset,
    saveFromLibrary,
    togglePublish,
    deleteAsset,
  };
}
