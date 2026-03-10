import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AdminUser {
  id: string;
  user_id: string;
  display_name: string | null;
  gamer_tag: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  email_confirmed: boolean;
  has_email: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export const useTenantsList = () => {
  return useQuery({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data as Tenant[];
    },
  });
};

export const useAdminUsers = (search: string, tenantId?: string) => {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search, tenantId],
    queryFn: async () => {
      // Fetch all profiles
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.or(`display_name.ilike.%${search}%,gamer_tag.ilike.%${search}%`);
      }
      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*");
      if (rolesError) throw rolesError;

      // Fetch user_service_interests for tenant association
      const { data: interests, error: intError } = await supabase
        .from("user_service_interests")
        .select("user_id, tenant_id");
      if (intError) throw intError;

      // Fetch tenants for name resolution
      const { data: tenants, error: tError } = await supabase
        .from("tenants")
        .select("id, name");
      if (tError) throw tError;

      const tenantMap = new Map((tenants ?? []).map((t: any) => [t.id, t.name]));
      const interestMap = new Map((interests ?? []).map((i: any) => [i.user_id, i.tenant_id]));
      const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]) ?? []);

      let result = (profiles ?? []).map((p: any) => {
        const tId = interestMap.get(p.user_id) as string | undefined;
        return {
          id: p.id,
          user_id: p.user_id,
          display_name: p.display_name,
          gamer_tag: p.gamer_tag,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          role: (roleMap.get(p.user_id) as string) ?? null,
          tenant_id: tId ?? null,
          tenant_name: tId ? (tenantMap.get(tId) as string) ?? null : null,
          email_confirmed: true,
          has_email: true,
        };
      }) as AdminUser[];

      if (tenantId) {
        result = result.filter((u) => u.tenant_id === tenantId);
      }

      // Fetch confirmation status from edge function
      const userIds = result.map((u) => u.user_id);
      if (userIds.length > 0) {
        try {
          const { data: confirmData } = await supabase.functions.invoke("check-users-confirmed", {
            body: { user_ids: userIds },
          });
          if (confirmData?.confirmed) {
            result = result.map((u) => ({
              ...u,
              email_confirmed: confirmData.confirmed[u.user_id] ?? true,
              has_email: confirmData.has_email?.[u.user_id] ?? true,
            }));
          }
        } catch {
          // Silently fail – confirmation status is supplementary
        }
      }

      return result;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string | null }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      if (role && role !== "user") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User role updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resendConfirmation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { user_id: userId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.already_confirmed) {
        toast({ title: "Already confirmed", description: "This user has already verified their email." });
      } else {
        toast({ title: "Confirmation email sent" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { users, isLoading, setRole, resendConfirmation };
};
