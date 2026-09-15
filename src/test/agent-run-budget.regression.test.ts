import { describe, it, expect } from "vitest";
import {
  classifyFailure,
  continuationBudget,
  completenessRatio,
  COMPLETENESS_TOLERANCE,
  FAILURE_MESSAGE,
  adaptiveTurnReserveMs,
  hasNoForwardProgress,
  fulfilledRowIdsFromTranscript,
  mergeRowIds,
} from "../../supabase/functions/_shared/seed-scope.ts";

/**
 * Regression cover for the run-reliability checkpoint (2026-09-12).
 *
 * The failures this guards against are the ones the investigation actually
 * found: budget exhaustion mislabelled as a timeout, a continuation ceiling
 * unrelated to the size of the job, a run that exits cleanly having produced
 * half its work, and a provider error body reaching a tenant admin.
 */

describe("failure classification", () => {
  it("does not call budget exhaustion a timeout", () => {
    expect(classifyFailure("continuation_limit_exceeded")).toBe("continuation_budget_exhausted");
    expect(classifyFailure("continuation_budget_exhausted: used 91 of 90 continuations")).toBe(
      "continuation_budget_exhausted",
    );
  });

  it("separates a pre-flight balance block from mid-run exhaustion", () => {
    expect(classifyFailure("insufficient_credits")).toBe("insufficient_credits");
    expect(classifyFailure("Anthropic 400: your credit balance is too low")).toBe("credit_exhausted");
  });

  it("classifies a stalled run distinctly", () => {
    expect(classifyFailure("no_forward_progress: no rows committed across 5 consecutive continuations")).toBe(
      "no_forward_progress",
    );
  });

  it("still recognises real timeouts", () => {
    expect(classifyFailure("anthropic_timeout after 90000ms")).toBe("timeout");
    expect(classifyFailure("anthropic_stream_idle: no tokens for 45000ms")).toBe("timeout");
  });
});

describe("tenant-facing failure text", () => {
  it("never carries a provider error body", () => {
    for (const msg of Object.values(FAILURE_MESSAGE)) {
      expect(msg).toBeTruthy();
      expect(msg).not.toMatch(/anthropic|http|\b4\d\d\b|\{|\}/i);
    }
  });

  it("tells an out-of-credit workspace nothing was created", () => {
    expect(FAILURE_MESSAGE.insufficient_credits).toMatch(/nothing was created/i);
  });
});

describe("continuation budget is derived from the work", () => {
  it("never drops below the historical floor of 60", () => {
    expect(continuationBudget(null)).toBe(60);
    expect(continuationBudget({ campaigns: 1, assets: 1, posts: 1 })).toBe(60);
  });

  it("grows with the size of the job", () => {
    // The run that died at 60: 23 campaigns / 39 assets / 39 posts.
    expect(continuationBudget({ campaigns: 23, assets: 39, posts: 39 })).toBeGreaterThan(60);
    expect(continuationBudget({ campaigns: 23, assets: 39, posts: 39 })).toBe(152);
  });

  it("is capped so a runaway preflight cannot buy unlimited invocations", () => {
    expect(continuationBudget({ campaigns: 9999, assets: 9999, posts: 9999 })).toBe(400);
  });
});

describe("measured reserve and no-progress boundary", () => {
  it("uses the cold-start reserve until three turns are measured", () => {
    expect(adaptiveTurnReserveMs([{ ms: 5000 }, { ms: 9000 }])).toBe(30000);
  });

  it("uses p95 with safety margin and clamps the result", () => {
    expect(adaptiveTurnReserveMs([{ ms: 5000 }, { ms: 9000 }, { ms: 15000 }])).toBe(20000);
    expect(adaptiveTurnReserveMs([{ ms: 5000 }, { ms: 9000 }, { ms: 50000 }])).toBe(45000);
  });

  it("halts only after five consecutive non-progress handoffs", () => {
    expect(hasNoForwardProgress([{ delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 }])).toBe(false);
    expect(hasNoForwardProgress([{ delta: 1 }, { delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 }])).toBe(false);
    expect(hasNoForwardProgress([{ delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 }, { delta: 0 }])).toBe(true);
  });
});

describe("replay-aware fulfillment", () => {
  it("counts idempotently reused create results without double counting", () => {
    const transcript = [
      { role: "assistant", content: [
        { type: "tool_use", id: "c1", name: "create_campaign_draft" },
        { type: "tool_use", id: "a1", name: "compose_event_promo" },
      ] },
      { role: "user", content: [
        { type: "tool_result", tool_use_id: "c1", content: JSON.stringify({ campaign: { id: "campaign-1", _idempotent: true } }) },
        { type: "tool_result", tool_use_id: "a1", content: JSON.stringify({ asset: { id: "asset-1", _idempotent: true } }) },
      ] },
    ];
    const fulfilled = fulfilledRowIdsFromTranscript(transcript);
    expect(mergeRowIds({ campaigns: ["campaign-1"], scheduled_posts: [], tenant_marketing_assets: [] }, fulfilled)).toEqual({
      campaigns: ["campaign-1"], scheduled_posts: [], tenant_marketing_assets: ["asset-1"],
    });
  });

  it("ignores read results and failed create results", () => {
    const transcript = [
      { role: "assistant", content: [{ type: "tool_use", id: "r1", name: "list_pending_agent_drafts" }, { type: "tool_use", id: "p1", name: "propose_scheduled_post" }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "r1", content: JSON.stringify({ campaigns: [{ id: "not-counted" }] }) }, { type: "tool_result", tool_use_id: "p1", is_error: true, content: "failed" }] },
    ];
    expect(fulfilledRowIdsFromTranscript(transcript)).toEqual({ campaigns: [], scheduled_posts: [], tenant_marketing_assets: [] });
  });
});

describe("completeness", () => {
  const expected = { campaigns: 23, assets: 39, posts: 39 }; // 101 units

  it("fails a run that exited cleanly at 55%", () => {
    const ratio = completenessRatio(expected, 56)!;
    expect(ratio).toBeLessThan(1 - COMPLETENESS_TOLERANCE);
  });

  it("passes a run inside tolerance", () => {
    const ratio = completenessRatio(expected, 95)!;
    expect(ratio).toBeGreaterThanOrEqual(1 - COMPLETENESS_TOLERANCE);
  });

  it("is undefined rather than zero when there is no expectation", () => {
    expect(completenessRatio(null, 10)).toBeNull();
  });
});
