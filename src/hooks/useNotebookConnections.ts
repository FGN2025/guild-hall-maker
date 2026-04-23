import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotebookConnection {
  id: string;
  name: string;
  api_url: string;
  notebook_id: string;
  is_active: boolean;
  last_health_check: string | null;
  last_health_status: string | null;
  game_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotebookConnections() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notebook-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notebook_connections" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NotebookConnection[];
    },
  });

  const addConnection = useMutation({
    mutationFn: async (conn: { name: string; api_url: string; notebook_id: string; game_id?: string | null }) => {
      const { error } = await supabase
        .from("admin_notebook_connections" as any)
        .insert(conn as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook-connections"] });
      toast({ title: "Connection added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotebookConnection> & { id: string }) => {
      const { error } = await supabase
        .from("admin_notebook_connections" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook-connections"] });
      toast({ title: "Connection updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_notebook_connections" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebook-connections"] });
      toast({ title: "Connection deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testHealth = async (apiUrl: string, connectionId?: string) => {
    const { data, error } = await supabase.functions.invoke("notebook-proxy", {
      body: { action: "health", api_url: apiUrl },
    });
    if (error) throw error;

    if (connectionId) {
      await supabase
        .from("admin_notebook_connections" as any)
        .update({
          last_health_check: new Date().toISOString(),
          last_health_status: data?.status === "healthy" ? "healthy" : "error",
        } as any)
        .eq("id", connectionId);
      qc.invalidateQueries({ queryKey: ["notebook-connections"] });
    }

    return data;
  };

  const fetchNotebooks = async (apiUrl: string) => {
    const { data, error } = await supabase.functions.invoke("notebook-proxy", {
      body: { action: "notebooks", api_url: apiUrl },
    });
    if (error) throw error;
    return data;
  };

  const fetchSources = async (apiUrl: string, notebookId: string) => {
    const { data, error } = await supabase.functions.invoke("notebook-proxy", {
      body: { action: "sources", api_url: apiUrl, notebook_id: notebookId },
    });
    if (error) throw error;
    return data;
  };

  const fetchNotes = async (apiUrl: string, notebookId: string) => {
    const { data, error } = await supabase.functions.invoke("notebook-proxy", {
      body: { action: "notes", api_url: apiUrl, notebook_id: notebookId },
    });
    if (error) throw error;
    return data;
  };

  const searchNotebook = async (apiUrl: string, notebookId: string, query: string) => {
    const { data, error } = await supabase.functions.invoke("notebook-proxy", {
      body: { action: "search", api_url: apiUrl, notebook_id: notebookId, query },
    });
    if (error) throw error;
    return data;
  };

  return {
    connections: query.data ?? [],
    isLoading: query.isLoading,
    addConnection,
    updateConnection,
    deleteConnection,
    testHealth,
    fetchNotebooks,
    fetchSources,
    fetchNotes,
    searchNotebook,
  };
}
