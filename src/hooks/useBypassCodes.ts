import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BypassCode {
  id: string;
  code: string;
  description: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

interface CreateBypassCodeInput {
  code: string;
  description?: string;
  max_uses?: number | null;
  expires_at?: string | null;
}

export function useBypassCodes() {
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["bypass-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bypass_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BypassCode[];
    },
  });

  const createCode = useMutation({
    mutationFn: async (input: CreateBypassCodeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("bypass_codes").insert({
        code: input.code,
        description: input.description || null,
        max_uses: input.max_uses ?? null,
        expires_at: input.expires_at || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bypass-codes"] });
      toast.success("Bypass code created.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCode = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; description?: string; max_uses?: number | null; expires_at?: string | null; is_active?: boolean }) => {
      const { error } = await supabase
        .from("bypass_codes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bypass-codes"] });
      toast.success("Code updated.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bypass_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bypass-codes"] });
      toast.success("Code deleted.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { codes, isLoading, createCode, updateCode, deleteCode };
}
