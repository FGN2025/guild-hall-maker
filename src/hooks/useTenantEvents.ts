import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TenantEvent {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  game: string;
  description: string | null;
  format: string;
  max_participants: number;
  prize_pool: string | null;
  prize_type: string;
  prize_id: string | null;
  points_participation: number;
  discord_role_id: string | null;
  prize_pct_first: number;
  prize_pct_second: number;
  prize_pct_third: number;
  start_date: string;
  end_date: string | null;
  rules: string | null;
  image_url: string | null;
  status: string;
  is_public: boolean;
  registration_open: boolean;
  social_copy: string | null;
  created_at: string;
  updated_at: string;
}

export type TenantEventInsert = Omit<TenantEvent, "id" | "created_at" | "updated_at">;

export function useTenantEvents(tenantId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["tenant-events", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_events" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TenantEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (event: Partial<TenantEventInsert>) => {
      const { data, error } = await supabase
        .from("tenant_events" as any)
        .insert({
          ...event,
          tenant_id: tenantId,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TenantEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-events", tenantId] });
      toast.success("Event created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantEvent> & { id: string }) => {
      const { error } = await supabase
        .from("tenant_events" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-events", tenantId] });
      toast.success("Event updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_events" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-events", tenantId] });
      toast.success("Event deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const registrationsQuery = (eventId: string) =>
    useQuery({
      queryKey: ["tenant-event-registrations", eventId],
      enabled: !!eventId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tenant_event_registrations" as any)
          .select("*")
          .eq("event_id", eventId);
        if (error) throw error;
        return data ?? [];
      },
    });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    registrationsQuery,
  };
}
