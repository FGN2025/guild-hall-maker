import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketingCampaign {
  id: string;
  title: string;
  description: string | null;
  social_copy: string | null;
  category: string;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  tenant_id: string | null;
  status: string;
  agent_source: string | null;
  proposed_by: string | null;
  feedback_note: string | null;
  idempotency_key: string | null;
  target_platforms: string[];
  source_event_id: string | null;
  source_tournament_id: string | null;
}

/** Converged create shape — identical to what the agent lane writes through
 *  `create_campaign_draft`, so human-created and agent-created campaigns are
 *  the same row shape (tenant scoping, review status, event linkage). */
export interface CreateCampaignInput {
  title: string;
  description?: string | null;
  social_copy?: string | null;
  category?: string;
  /** null / omitted = platform-level campaign (admin marketing library). */
  tenant_id?: string | null;
  status?: "draft" | "pending_review" | "approved" | "rejected" | "published";
  target_platforms?: string[];
  source_event_id?: string | null;
  source_tournament_id?: string | null;
  source_challenge_id?: string | null;
  idempotency_key?: string | null;
}

export interface MarketingAsset {
  id: string;
  campaign_id: string;
  label: string;
  file_path: string;
  url: string;
  width: number | null;
  height: number | null;
  display_order: number;
  created_at: string;
}

const CAMPAIGNS_KEY = ["marketing_campaigns"];

export function useMarketingCampaigns(publishedOnly = false) {
  const qc = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: [...CAMPAIGNS_KEY, publishedOnly],
    queryFn: async () => {
      let q = supabase
        .from("marketing_campaigns" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (publishedOnly) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as MarketingCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (values: CreateCampaignInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const row = {
        title: values.title,
        description: values.description ?? null,
        social_copy: values.social_copy ?? null,
        category: values.category ?? "social_media",
        tenant_id: values.tenant_id ?? null,
        status: values.status ?? "draft",
        target_platforms: values.target_platforms ?? [],
        source_event_id: values.source_event_id ?? null,
        source_tournament_id: values.source_tournament_id ?? null,
        idempotency_key: values.idempotency_key ?? null,
        created_by: uid,
      };

      // `.select()` so an RLS-filtered write surfaces as an error instead of a
      // silent 204 (same guard as the draft-decision path).
      const { data, error } = await supabase
        .from("marketing_campaigns" as any)
        .insert(row as any)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("Campaign insert was blocked (0 rows returned).");
      return (data as any).id as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }); toast.success("Campaign created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...values }: Partial<MarketingCampaign> & { id: string }) => {
      const { error } = await supabase
        .from("marketing_campaigns" as any)
        .update(values as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }); toast.success("Campaign updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_campaigns" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }); toast.success("Campaign deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { campaigns: campaignsQuery.data ?? [], isLoading: campaignsQuery.isLoading, createCampaign, updateCampaign, deleteCampaign };
}

export function useMarketingAssets(campaignId: string | undefined) {
  const qc = useQueryClient();
  const key = ["marketing_assets", campaignId];

  const assetsQuery = useQuery({
    queryKey: key,
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_assets" as any)
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("display_order");
      if (error) throw error;
      return data as unknown as MarketingAsset[];
    },
  });

  const uploadAsset = useMutation({
    mutationFn: async ({ file, label }: { file: File; label: string }) => {
      const ext = file.name.split(".").pop();
      const path = `marketing/${campaignId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("app-media").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("app-media").getPublicUrl(path);

      const { error } = await supabase
        .from("marketing_assets" as any)
        .insert({ campaign_id: campaignId, label, file_path: path, url: urlData.publicUrl } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Asset uploaded"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAsset = useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path: string }) => {
      await supabase.storage.from("app-media").remove([file_path]);
      const { error } = await supabase.from("marketing_assets" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Asset deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addAssetFromUrl = useMutation({
    mutationFn: async ({ url, file_path, label }: { url: string; file_path: string; label: string }) => {
      const { error } = await supabase
        .from("marketing_assets" as any)
        .insert({ campaign_id: campaignId, label, file_path, url } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); toast.success("Asset added from library"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { assets: assetsQuery.data ?? [], isLoading: assetsQuery.isLoading, uploadAsset, deleteAsset, addAssetFromUrl };
}
