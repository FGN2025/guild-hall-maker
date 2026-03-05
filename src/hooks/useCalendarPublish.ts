import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CalendarPublishConfig {
  id: string;
  tenant_id: string | null;
  title: string;
  logo_url: string | null;
  bg_image_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  show_platform_tournaments: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CalendarPublishInsert = Omit<CalendarPublishConfig, "id" | "created_at" | "updated_at">;

const TABLE = "calendar_publish_configs" as any;

export function useCalendarPublishConfigs(tenantId?: string | null) {
  return useQuery({
    queryKey: ["calendar_publish_configs", tenantId ?? "platform"],
    queryFn: async () => {
      let q = supabase.from(TABLE).select("*");
      if (tenantId) {
        q = q.eq("tenant_id", tenantId);
      } else {
        q = q.is("tenant_id", null);
      }
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CalendarPublishConfig[];
    },
  });
}

export function useCalendarPublishById(configId: string | undefined) {
  return useQuery({
    queryKey: ["calendar_publish_config", configId],
    enabled: !!configId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", configId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CalendarPublishConfig | null;
    },
  });
}

export function useUpsertCalendarConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<CalendarPublishConfig> & { created_by: string }) => {
      if (config.id) {
        const { id, created_by, created_at, ...rest } = config as any;
        const { data, error } = await supabase
          .from(TABLE)
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as CalendarPublishConfig;
      } else {
        const { data, error } = await supabase
          .from(TABLE)
          .insert(config)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as CalendarPublishConfig;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar_publish_configs"] });
      toast({ title: "Saved", description: "Calendar configuration saved." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteCalendarConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar_publish_configs"] });
      toast({ title: "Deleted", description: "Calendar configuration removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
