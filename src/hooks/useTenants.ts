import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TenantAdmin {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    user_id: string;
  };
}

interface CreateTenantInput {
  name: string;
  slug: string;
  contact_email?: string;
  logo_url?: string;
}

interface UpdateTenantInput {
  id: string;
  name?: string;
  slug?: string;
  contact_email?: string | null;
  logo_url?: string | null;
  status?: string;
}

export function useTenants() {
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const createTenant = useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const { error } = await supabase.from("tenants").insert({
        name: input.name,
        slug: input.slug,
        contact_email: input.contact_email || null,
        logo_url: input.logo_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant created.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTenant = useMutation({
    mutationFn: async (input: UpdateTenantInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase.from("tenants").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant updated.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { tenants, isLoading, createTenant, updateTenant, deleteTenant };
}

export function useTenantAdmins(tenantId: string | null) {
  const queryClient = useQueryClient();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["tenant-admins", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      // Get tenant admins
      const { data: adminRows, error } = await supabase
        .from("tenant_admins")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      if (!adminRows || adminRows.length === 0) return [];

      // Get profiles for these user_ids
      const userIds = adminRows.map((a: any) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return adminRows.map((row: any) => ({
        ...row,
        profile: profileMap.get(row.user_id) || null,
      })) as TenantAdmin[];
    },
  });

  const addAdmin = useMutation({
    mutationFn: async ({ tenantId, userId, role = 'admin' }: { tenantId: string; userId: string; role?: string }) => {
      const { error } = await supabase.from("tenant_admins").insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-admins", tenantId] });
      toast.success("Admin added.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeAdmin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-admins", tenantId] });
      toast.success("Admin removed.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("tenant_admins").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-admins", tenantId] });
      toast.success("Role updated.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { admins, isLoading, addAdmin, removeAdmin, updateRole };
}
