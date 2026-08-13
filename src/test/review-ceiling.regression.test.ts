import { describe, it, expect } from "vitest";

/**
 * Standing regression check for the pending_review approval ceiling.
 *
 * This test is a thin client: the 16-case matrix (plus 4 adjacent access
 * checks) executes inside the `review-ceiling-selftest` edge function against
 * the REAL database, in a transaction that is always rolled back. It has to
 * run there, because the bug class lives in Postgres behaviour — role
 * identity, SECURITY DEFINER vs INVOKER, JWT claim inspection and column
 * defaults. A mocked version would have passed while the ceiling was open.
 *
 * The endpoint returns HTTP 500 with the failing case names when any case
 * fails, so this assertion cannot silently go green.
 */
const URL_BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe("marketing approval ceiling — live database regression matrix", () => {
  it("refuses every agent write past pending_review while leaving humans, the revision loop and the dispatcher working", async () => {
    const res = await fetch(`${URL_BASE}/functions/v1/review-ceiling-selftest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      // CEILING_FAULT lets anyone reproduce a red run on demand:
      //   CEILING_FAULT=security_definer|drop_claim_check|drop_insert_guard
      // The fault is applied inside the rolled-back transaction only.
      body: JSON.stringify({ fault: process.env.CEILING_FAULT ?? "" }),
    });
    const body = await res.json();

    if (!body.ok) {
      const failed = (body.cases ?? []).filter((c: any) => !c.passed);
      throw new Error(
        `APPROVAL CEILING REGRESSION — ${failed.length}/${body.total} cases failed\n` +
          failed
            .map((c: any) => `  [${c.id}] ${c.path}: ${c.case}\n      -> ${c.detail}`)
            .join("\n") +
          (body.error ? `\n  harness error: ${body.error}` : ""),
      );
    }

    expect(res.status).toBe(200);
    expect(body.total).toBeGreaterThanOrEqual(20);
    expect(body.failed).toBe(0);

    // Every group must actually be present: a suite that silently stops
    // running half its cases is the same failure mode we are guarding against.
    const groups = new Set(body.cases.map((c: any) => c.group));
    for (const g of ["agent_refusal", "human_success", "revision_loop", "dispatcher", "adjacent"]) {
      expect(groups.has(g), `missing case group: ${g}`).toBe(true);
    }
    // 6 refusals: the two "omit status" cases are now allow-cases because the
    // column default is 'draft' (unpublishable) rather than 'pending'.
    expect(body.cases.filter((c: any) => c.group === "agent_refusal").length).toBe(6);
    expect(body.cases.filter((c: any) => c.group === "agent_allowed").length).toBe(2);
    expect(body.cases.filter((c: any) => c.group === "human_success").length).toBe(4);
    expect(body.cases.filter((c: any) => c.group === "revision_loop").length).toBe(2);
    expect(body.cases.filter((c: any) => c.group === "dispatcher").length).toBe(2);
  }, 60_000);
});
