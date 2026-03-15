import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Subscribe to realtime changes on community tables and auto-invalidate queries */
export function useCommunityRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("community-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community-topics"] });
          queryClient.invalidateQueries({ queryKey: ["community-replies"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_likes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community-topics"] });
          queryClient.invalidateQueries({ queryKey: ["community-replies"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export interface CommunityTopic {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  author_name: string;
  reply_count: number;
  like_count: number;
  is_pinned: boolean;
}

export interface CommunityReply {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
  like_count: number;
}

export function useTopics() {
  return useQuery({
    queryKey: ["community-topics"],
    queryFn: async (): Promise<CommunityTopic[]> => {
      // Fetch top-level posts
      const { data: posts, error } = await supabase
        .from("community_posts")
        .select("id, user_id, title, body, category, created_at, is_pinned")
        .is("parent_id", null)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const postIds = posts.map((p) => p.id);

      // Parallel: profiles, reply counts, like counts
      const [profilesRes, repliesRes, likesRes] = await Promise.all([
        (supabase.from as any)("profiles_public").select("user_id, display_name, gamer_tag").in("user_id", userIds),
        supabase.from("community_posts").select("parent_id").in("parent_id", postIds),
        supabase.from("community_likes").select("post_id").in("post_id", postIds),
      ]);

      const profileMap = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => {
        profileMap.set(p.user_id, p.gamer_tag || p.display_name || "Anonymous");
      });

      const replyCountMap = new Map<string, number>();
      (repliesRes.data ?? []).forEach((r) => {
        replyCountMap.set(r.parent_id!, (replyCountMap.get(r.parent_id!) ?? 0) + 1);
      });

      const likeCountMap = new Map<string, number>();
      (likesRes.data ?? []).forEach((l) => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
      });

      return posts.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        title: p.title ?? "(Untitled)",
        body: p.body,
        category: p.category,
        created_at: p.created_at,
        author_name: profileMap.get(p.user_id) ?? "Anonymous",
        reply_count: replyCountMap.get(p.id) ?? 0,
        like_count: likeCountMap.get(p.id) ?? 0,
        is_pinned: p.is_pinned ?? false,
      }));
    },
  });
}

export function useReplies(postId: string | null) {
  return useQuery({
    queryKey: ["community-replies", postId],
    enabled: !!postId,
    queryFn: async (): Promise<CommunityReply[]> => {
      const { data: replies, error } = await supabase
        .from("community_posts")
        .select("id, user_id, body, created_at")
        .eq("parent_id", postId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!replies || replies.length === 0) return [];

      const userIds = [...new Set(replies.map((r) => r.user_id))];
      const replyIds = replies.map((r) => r.id);

      const [profilesRes, likesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, gamer_tag").in("user_id", userIds),
        supabase.from("community_likes").select("post_id").in("post_id", replyIds),
      ]);

      const profileMap = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => {
        profileMap.set(p.user_id, p.gamer_tag || p.display_name || "Anonymous");
      });

      const likeCountMap = new Map<string, number>();
      (likesRes.data ?? []).forEach((l) => {
        likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
      });

      return replies.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        body: r.body,
        created_at: r.created_at,
        author_name: profileMap.get(r.user_id) ?? "Anonymous",
        like_count: likeCountMap.get(r.id) ?? 0,
      }));
    },
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ title, body, category }: { title: string; body: string; category: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, title, body, category });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-topics"] });
    },
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ parentId, body }: { parentId: string; body: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, parent_id: parentId, body, category: "Discussion" });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-replies", variables.parentId] });
      queryClient.invalidateQueries({ queryKey: ["community-topics"] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Check existing
      const { data: existing } = await supabase
        .from("community_likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      if (existing) {
        await supabase.from("community_likes").delete().eq("id", existing.id);
      } else {
        const { error } = await supabase
          .from("community_likes")
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-topics"] });
      queryClient.invalidateQueries({ queryKey: ["community-replies"] });
    },
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_pinned: pinned })
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-topics"] });
    },
  });
}
