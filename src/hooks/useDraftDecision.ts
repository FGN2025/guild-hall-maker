import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DraftKind = "campaign" | "scheduled_post" | "asset";

export interface DecidableRow {
  id: string;
  kind: DraftKind;
  description?: string | null;
  notes?: string | null;
}

interface DecideArgs {
  row: DecidableRow;
  approve: boolean;
  note?: string | null;
}

/**
 * Single source of truth for approving/rejecting agent drafts across surfaces
 * (Agent Drafts panel, Scheduled Posts calendar, etc.).
 *
 * Preserves the zero-row RLS guard and red-toast error surfacing added in the
 * approve-handler fix.
 */
export function useDraftDecision(tenantId: string | null | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ row, approve, note }: DecideArgs) => {
      const table =
        row.kind === "campaign"
          ? "marketing_campaigns"
          : row.kind === "scheduled_post"
          ? "scheduled_posts"
          : "tenant_marketing_assets";
      const trimmed = note?.trim() || null;

      let patch: Record<string, unknown>;
      if (row.kind === "asset") {
        patch = approve
          ? { is_published: true, feedback_note: null, notes: trimmed ?? row.description ?? null }
          : {
              // feedback_note is the durable, agent-readable field; the notes
              // marker is kept so existing UI/filters keep working.
              feedback_note: trimmed,
              notes: trimmed ? `[Rejected] ${trimmed}` : "[Rejected]",
            };
      } else if (row.kind === "scheduled_post") {
        // DISPATCHER CONTRACT: publish-scheduled-posts selects
        //   .eq("status", "pending")  (supabase/functions/publish-scheduled-posts/index.ts:130)
        // so a human approval MUST write exactly "pending". Do not write
        // "approved" here — that value belongs to marketing_campaigns only and
        // would silently strand the post. See docs/tech-debt.md (status naming).
        patch = approve
          ? { status: "pending", feedback_note: trimmed }
          : { status: "rejected", feedback_note: trimmed };
      } else {
        patch = approve
          ? { status: "approved", is_published: true, feedback_note: trimmed }
          : { status: "rejected", feedback_note: trimmed };
      }

      const { data, error } = await supabase
        .from(table as any)
        .update(patch)
        .eq("id", row.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          `Update was blocked (0 rows changed). This usually means your session lost permission on this ${row.kind.replace("_", " ")} — try signing out and back in, then re-approving.`,
        );
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Approved" : "Rejected with feedback");
      // Refresh both surfaces so Scheduled + Agent Drafts stay consistent.
      qc.invalidateQueries({ queryKey: ["agent_drafts", tenantId] });
      qc.invalidateQueries({ queryKey: ["scheduled_posts", tenantId] });
      // Portal bell + Marketing badge read the same queue; keep them honest.
      qc.invalidateQueries({ queryKey: ["tenant_review_queue"] });
    },

    onError: (err: any) => toast.error(err?.message ?? "Update failed"),
  });
}
