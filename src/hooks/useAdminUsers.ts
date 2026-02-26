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
}

export const useAdminUsers = (search: string) => {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search],
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

      const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]) ?? []);

      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        gamer_tag: p.gamer_tag,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        role: (roleMap.get(p.user_id) as string) ?? null,
      })) as AdminUser[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string | null }) => {
      // Remove existing role first
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Insert new role if not "user"
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

  return { users, isLoading, setRole };
};
