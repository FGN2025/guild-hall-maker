import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  contact_email: string | null;
  primary_color: string | null;
  accent_color: string | null;
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
  primary_color?: string;
  accent_color?: string;
}

interface UpdateTenantInput {
  id: string;
  name?: string;
  slug?: string;
  contact_email?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  status?: string;
  require_subscriber_validation?: boolean;
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
        primary_color: input.primary_color || null,
        accent_color: input.accent_color || null,
      } as any);
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

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  invited_by: string;
  claimed_at: string | null;
  created_at: string;
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

      // Fetch emails as fallback for users with no display_name
      let emailMap = new Map<string, string>();
      const missingNameIds = userIds.filter((uid: string) => {
        const p = profileMap.get(uid);
        return !p || !p.display_name;
      });
      if (missingNameIds.length > 0) {
        try {
          const { data: confirmData } = await supabase.functions.invoke("check-users-confirmed", {
            body: { user_ids: missingNameIds },
          });
          if (confirmData?.emails) {
            emailMap = new Map(Object.entries(confirmData.emails));
          }
        } catch {
          // Non-critical — display will fall back to "Unknown"
        }
      }

      return adminRows.map((row: any) => {
        const profile = profileMap.get(row.user_id);
        const email = emailMap.get(row.user_id);
        return {
          ...row,
          profile: profile
            ? { ...profile, display_name: profile.display_name || email || null }
            : email ? { user_id: row.user_id, display_name: email } : null,
        };
      }) as TenantAdmin[];
    },
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["tenant-invitations", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_invitations" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .is("claimed_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TenantInvitation[];
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

  const createInvitation = useMutation({
    mutationFn: async ({ tenantId, email, role, tenantName }: { tenantId: string; email: string; role: string; tenantName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tenant_invitations" as any).insert({
        tenant_id: tenantId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      });
      if (error) throw error;

      // Send invitation email
      try {
        await supabase.functions.invoke("send-tenant-invite", {
          body: {
            email: email.toLowerCase().trim(),
            tenantName: tenantName || "a provider",
            role,
            invitedBy: user.email,
          },
        });
      } catch (emailErr) {
        console.error("Failed to send invite email:", emailErr);
        // Don't fail the mutation if email fails — invitation is still created
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Invitation created. Role will be assigned when they register.");
    },
    onError: (err: any) => {
      if (err.message?.includes("tenant_invitations_tenant_id_email_key")) {
        toast.error("An invitation is already pending for this email address.");
      } else {
        toast.error(err.message);
      }
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_invitations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-invitations", tenantId] });
      toast.success("Invitation cancelled.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { admins, isLoading, invitations, invitationsLoading, addAdmin, removeAdmin, updateRole, createInvitation, cancelInvitation };
}
