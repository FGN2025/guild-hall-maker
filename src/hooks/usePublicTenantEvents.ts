import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TenantEvent } from "./useTenantEvents";

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

export function usePublicTenantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-tenant", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug, logo_url, primary_color, accent_color")
        .eq("slug", slug!)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data as PublicTenant;
    },
  });
}

export function usePublicTenantEvents(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["public-tenant-events", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_events" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_public", true)
        .eq("status", "published")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TenantEvent[];
    },
  });
}

export function usePublicTenantEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["public-tenant-event", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_events" as any)
        .select("*")
        .eq("id", eventId!)
        .eq("is_public", true)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data as unknown as TenantEvent;
    },
  });
}

export function usePublicEventAssets(eventId: string | undefined) {
  return useQuery({
    queryKey: ["public-event-assets", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_event_assets" as any)
        .select("*")
        .eq("event_id", eventId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
