import { supabase } from "@/integrations/supabase/client";

export type CapacityInfo = {
  /** Exact registered count. `null` when the caller is not platform staff. */
  count: number | null;
  max_participants: number;
  is_full: boolean;
};

/**
 * Single fetch path for tournament capacity.
 *
 * Platform staff (Admin/Moderator) call `get_tournament_registration_counts`,
 * which is now guarded server-side and granted to `authenticated` only.
 * Everyone else calls `get_tournament_capacity`, which returns capacity and a
 * full flag without the registered integer ever crossing the API boundary.
 */
export async function fetchTournamentCapacity(
  tournamentIds: string[],
  canSeeCounts: boolean
): Promise<Map<string, CapacityInfo>> {
  const map = new Map<string, CapacityInfo>();
  if (tournamentIds.length === 0) return map;

  const { data: capRows } = await supabase.rpc("get_tournament_capacity" as any, {
    _tournament_ids: tournamentIds,
  } as any);

  ((capRows as any[]) ?? []).forEach((r: any) => {
    map.set(r.tournament_id, {
      count: null,
      max_participants: Number(r.max_participants) || 0,
      is_full: Boolean(r.is_full),
    });
  });

  if (canSeeCounts) {
    const { data: countRows } = await supabase.rpc(
      "get_tournament_registration_counts" as any,
      { _tournament_ids: tournamentIds } as any
    );
    ((countRows as any[]) ?? []).forEach((r: any) => {
      const existing = map.get(r.tournament_id);
      if (existing) existing.count = Number(r.registration_count) || 0;
    });
    // Tournaments with zero registrations return no row from the count RPC.
    tournamentIds.forEach((id) => {
      const e = map.get(id);
      if (e && e.count === null) e.count = 0;
    });
  }

  return map;
}
