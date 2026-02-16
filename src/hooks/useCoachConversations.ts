import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatMessage } from "@/hooks/useCoachChat";

export interface CoachConversation {
  id: string;
  title: string;
  game_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCoachConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("coach_conversations")
      .select("id, title, game_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations((data as CoachConversation[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(
    async (gameId: string | null, title: string): Promise<string | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("coach_conversations")
        .insert({ user_id: user.id, game_id: gameId, title })
        .select("id")
        .single();
      if (error || !data) return null;
      await fetchConversations();
      return data.id;
    },
    [user, fetchConversations]
  );

  const loadMessages = useCallback(
    async (conversationId: string): Promise<ChatMessage[]> => {
      const { data } = await supabase
        .from("coach_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return (data as ChatMessage[]) || [];
    },
    []
  );

  const saveMessage = useCallback(
    async (conversationId: string, role: "user" | "assistant", content: string) => {
      await supabase.from("coach_messages").insert({
        conversation_id: conversationId,
        role,
        content,
      });
      // Touch updated_at on conversation
      await supabase
        .from("coach_conversations")
        .update({ title: role === "user" ? content.slice(0, 60) : undefined })
        .eq("id", conversationId);
    },
    []
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("coach_conversations").delete().eq("id", id);
      await fetchConversations();
    },
    [fetchConversations]
  );

  return {
    conversations,
    loading,
    fetchConversations,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
  };
}
