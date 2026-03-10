import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreference {
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
}

const NOTIFICATION_TYPES = [
  { key: "redemption_update", label: "Prize Redemption Updates", description: "When your prize redemption is approved, fulfilled, or denied" },
  { key: "new_challenge", label: "New Challenges", description: "When a new challenge is published on the platform" },
  { key: "new_quest", label: "New Quests", description: "When a new quest is published on the platform" },
  { key: "tournament_starting", label: "Tournament Starting", description: "When a tournament you registered for goes live" },
  { key: "upcoming_tournament", label: "Upcoming Tournament Reminder", description: "Reminder ~24 hours before a tournament you joined starts" },
  { key: "registration_confirmed", label: "Registration Confirmed", description: "When you successfully register for a tournament" },
  { key: "match_completed", label: "Match Completed", description: "When a match you played in has a result recorded" },
  { key: "achievement_earned", label: "Achievement Earned", description: "When you unlock a new achievement or badge" },
] as const;

export { NOTIFICATION_TYPES };

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const qk = ["notification_preferences", user?.id];

  const query = useQuery({
    queryKey: qk,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("notification_type, in_app_enabled, email_enabled")
        .eq("user_id", user!.id);
      if (error) throw error;
      // Build a map with defaults for types that don't have a row yet
      const map: Record<string, NotificationPreference> = {};
      for (const t of NOTIFICATION_TYPES) {
        map[t.key] = { notification_type: t.key, in_app_enabled: true, email_enabled: true };
      }
      for (const row of data ?? []) {
        map[row.notification_type] = row as NotificationPreference;
      }
      return map;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      notification_type,
      channel,
      enabled,
    }: {
      notification_type: string;
      channel: "in_app" | "email";
      enabled: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const field = channel === "in_app" ? "in_app_enabled" : "email_enabled";

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            notification_type,
            [field]: enabled,
            // preserve the other field's current value
            ...(channel === "in_app"
              ? { email_enabled: query.data?.[notification_type]?.email_enabled ?? true }
              : { in_app_enabled: query.data?.[notification_type]?.in_app_enabled ?? true }),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,notification_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk }),
  });

  return { preferences: query.data, isLoading: query.isLoading, toggle };
};
