import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Runtime publishing controls, stored in app_settings so they can be thrown
 * without a deploy. Absent keys mean "off / unlimited", which is exactly the
 * behavior the dispatcher had before these controls existed.
 */
export const DISPATCH_KEYS = {
  killSwitch: "dispatch_kill_switch",
  pauseStartedAt: "dispatch_pause_started_at",
  graceUntil: "dispatch_stale_grace_until",
  quotaDaily: "publish_quota_daily",
  quotaMonthly: "publish_quota_monthly",
} as const;

const ALL_KEYS = Object.values(DISPATCH_KEYS);

export type QuotaSpec = { default: number | null; overrides: Record<string, number | null> };

export function parseQuota(raw: string | null | undefined): QuotaSpec {
  if (!raw) return { default: null, overrides: {} };
  const n = Number(raw);
  if (Number.isFinite(n)) return { default: n >= 0 ? n : null, overrides: {} };
  try {
    const p = JSON.parse(raw);
    const def = Number(p?.default);
    const overrides: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(p?.overrides ?? {})) {
      const num = Number(v);
      overrides[k] = Number.isFinite(num) && num >= 0 ? num : null;
    }
    return { default: Number.isFinite(def) && def >= 0 ? def : null, overrides };
  } catch {
    return { default: null, overrides: {} };
  }
}

export function quotaFor(spec: QuotaSpec, tenantId?: string | null): number | null {
  if (tenantId && Object.prototype.hasOwnProperty.call(spec.overrides, tenantId)) {
    return spec.overrides[tenantId];
  }
  return spec.default;
}

export type DispatchControlsState = {
  killSwitchOn: boolean;
  pausedSince: string | null;
  graceUntil: string | null;
  quotaDaily: QuotaSpec;
  quotaMonthly: QuotaSpec;
  raw: Record<string, string>;
};

export function useDispatchControls() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["dispatch_controls"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<DispatchControlsState> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ALL_KEYS as unknown as string[]);
      if (error) throw error;
      const raw: Record<string, string> = {};
      for (const r of data ?? []) if (r.value) raw[r.key] = r.value;
      const on = ["on", "true", "1", "yes", "enabled", "paused"].includes(
        (raw[DISPATCH_KEYS.killSwitch] ?? "").trim().toLowerCase(),
      );
      return {
        killSwitchOn: on,
        pausedSince: raw[DISPATCH_KEYS.pauseStartedAt] ?? null,
        graceUntil: raw[DISPATCH_KEYS.graceUntil] ?? null,
        quotaDaily: parseQuota(raw[DISPATCH_KEYS.quotaDaily]),
        quotaMonthly: parseQuota(raw[DISPATCH_KEYS.quotaMonthly]),
        raw,
      };
    },
  });

  /** Admin-only write. Passing null removes the key, restoring the default. */
  const setKey = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      if (value === null) {
        const { error } = await supabase.from("app_settings").delete().eq("key", key);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value } as any, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispatch_controls"] });
      toast.success("Publishing controls updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update controls"),
  });

  return { ...query, controls: query.data, setKey };
}

/** Dispatches actually published for a tenant in the current UTC day and month. */
export function useTenantPublishUsage(tenantId?: string | null) {
  return useQuery({
    queryKey: ["tenant_publish_usage", tenantId],
    enabled: !!tenantId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date();
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const [d, m] = await Promise.all([
        supabase
          .from("scheduled_posts" as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("status", "published")
          .gte("published_at", dayStart.toISOString()),
        supabase
          .from("scheduled_posts" as any)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("status", "published")
          .gte("published_at", monthStart.toISOString()),
      ]);
      return { daily: d.count ?? 0, monthly: m.count ?? 0 };
    },
  });
}
