import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AgentPrompt = {
  id: string;
  name: string;
  version: number;
  content: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useAgentPrompts(name = "marketing_agent") {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["agent_prompts", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_prompts" as any)
        .select("*")
        .eq("name", name)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgentPrompt[];
    },
  });

  const createVersion = useMutation({
    mutationFn: async (content: string) => {
      const list = listQuery.data ?? [];
      const nextVersion = (list[0]?.version ?? 0) + 1;
      const { data, error } = await supabase
        .from("agent_prompts" as any)
        .insert({ name, version: nextVersion, content, active: false })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AgentPrompt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_prompts", name] }),
  });

  const activate = useMutation({
    mutationFn: async (versionId: string) => {
      // Atomic: deactivate all others then activate target. The partial unique
      // index (name) WHERE active enforces single-active invariant.
      const { error: deErr } = await supabase
        .from("agent_prompts" as any)
        .update({ active: false })
        .eq("name", name);
      if (deErr) throw deErr;
      const { error } = await supabase
        .from("agent_prompts" as any)
        .update({ active: true })
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_prompts", name] }),
  });

  return { ...listQuery, createVersion, activate };
}
