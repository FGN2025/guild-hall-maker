import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChallengeWindow {
  starts_at: string;
  ends_at: string;
  headline: string | null;
}

export interface ChallengeWindowState {
  /** null when the user's tenant has not scheduled this challenge. */
  window: ChallengeWindow | null;
  /** false only when a window exists and now() is outside it. */
  canEnroll: boolean;
  /** Human-readable reason enrollment is blocked, or null. */
  blockedReason: string | null;
  isLoading: boolean;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Resolves the enrollment window a challenge has for the signed-in user's
 * tenant. Users with no tenant (and users whose tenant has not scheduled the
 * challenge) are never gated — this mirrors `challenge_window_open` in the DB.
 */
export const useChallengeWindow = (challengeId: string | undefined): ChallengeWindowState => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["challenge-window", challengeId, user?.id],
    enabled: !!challengeId && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: tenantId, error: rpcErr } = await supabase.rpc("get_user_tenant" as any, {
        _user_id: user!.id,
      });
      if (rpcErr) throw rpcErr;
      if (!tenantId) return null;

      const { data: rows, error } = await supabase
        .from("tenant_challenge_schedules" as any)
        .select("starts_at, ends_at, headline")
        .eq("tenant_id", tenantId as string)
        .eq("challenge_id", challengeId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;

      const list = (rows ?? []) as unknown as ChallengeWindow[];
      if (list.length === 0) return null;

      const now = Date.now();
      // Prefer an open window, then the next upcoming one, else the last closed.
      const open = list.find(
        (w) => now >= new Date(w.starts_at).getTime() && now <= new Date(w.ends_at).getTime(),
      );
      if (open) return open;
      const upcoming = list.find((w) => now < new Date(w.starts_at).getTime());
      return upcoming ?? list[list.length - 1];
    },
  });

  const window = data ?? null;

  if (!window) {
    return { window: null, canEnroll: true, blockedReason: null, isLoading };
  }

  const now = Date.now();
  if (now < new Date(window.starts_at).getTime()) {
    return {
      window,
      canEnroll: false,
      blockedReason: `Opens ${fmt(window.starts_at)}`,
      isLoading,
    };
  }
  if (now > new Date(window.ends_at).getTime()) {
    return {
      window,
      canEnroll: false,
      blockedReason: `Closed ${fmt(window.ends_at)}`,
      isLoading,
    };
  }

  return { window, canEnroll: true, blockedReason: null, isLoading };
};

export interface ChallengeWindowSummary {
  label: string;
  open: boolean;
}

/**
 * Bulk variant for list views: one query returns every window the signed-in
 * user's tenant has scheduled, keyed by challenge_id.
 */
export const useMyChallengeWindows = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-challenge-windows", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const map: Record<string, ChallengeWindowSummary> = {};
      const { data: tenantId } = await supabase.rpc("get_user_tenant" as any, { _user_id: user!.id });
      if (!tenantId) return map;

      const { data, error } = await supabase
        .from("tenant_challenge_schedules" as any)
        .select("challenge_id, starts_at, ends_at")
        .eq("tenant_id", tenantId as string);
      if (error) throw error;

      const now = Date.now();
      for (const row of (data ?? []) as any[]) {
        const start = new Date(row.starts_at).getTime();
        const end = new Date(row.ends_at).getTime();
        const open = now >= start && now <= end;
        const existing = map[row.challenge_id];
        // An open window always wins over a closed/upcoming one.
        if (existing?.open && !open) continue;
        map[row.challenge_id] = {
          open,
          label: open
            ? `Open until ${fmt(row.ends_at)}`
            : now < start
              ? `Opens ${fmt(row.starts_at)}`
              : `Closed ${fmt(row.ends_at)}`,
        };
      }
      return map;
    },
  });
};
