import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ScheduledPost = {
  id: string;
  tenant_id: string | null;
  user_id: string;
  connection_id: string;
  platform: string;
  image_url: string;
  caption: string;
  scheduled_at: string;
  status: string;
  published_at: string | null;
  post_url: string | null;
  error_message: string | null;
  created_at: string;
};

export function useScheduledPosts(tenantId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["scheduled_posts", tenantId, user?.id];

  const { data: posts = [], isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("scheduled_posts" as any)
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      else q = q.eq("user_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ScheduledPost[];
    },
  });

  const schedulePost = useMutation({
    mutationFn: async (input: {
      connection_id: string;
      platform: string;
      image_url: string;
      caption: string;
      scheduled_at: string;
    }) => {
      const { error } = await supabase.from("scheduled_posts" as any).insert({
        user_id: user!.id,
        tenant_id: tenantId ?? null,
        connection_id: input.connection_id,
        platform: input.platform,
        image_url: input.image_url,
        caption: input.caption,
        scheduled_at: input.scheduled_at,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Post scheduled"); },
    onError: () => toast.error("Failed to schedule post"),
  });

  const cancelPost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_posts" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Post cancelled"); },
    onError: () => toast.error("Failed to cancel post"),
  });

  const reschedulePost = useMutation({
    mutationFn: async ({ id, scheduled_at }: { id: string; scheduled_at: string }) => {
      const { error } = await supabase
        .from("scheduled_posts" as any)
        .update({ scheduled_at } as any)
        .eq("id", id)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("Post rescheduled"); },
    onError: () => toast.error("Failed to reschedule"),
  });

  return { posts, isLoading, schedulePost, cancelPost, reschedulePost };
}
