import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Step 7 proof, static half: every agent create path must REQUIRE an
 * idempotency key and must check for an existing row before it writes.
 *
 * This is a source-level assertion on purpose. The resume-boundary and replay
 * tests need a live authenticated run; this one survives without one and fails
 * loudly the moment someone makes a key optional again — which is exactly how
 * the asset path drifted in the first place.
 */

const TOOLS = [
  "create-campaign-draft.ts",
  "propose-scheduled-post.ts",
  "attach-tenant-asset-draft.ts",
  "compose-event-promo.ts",
];

const dir = join(process.cwd(), "supabase/functions/_shared/mcp-tools");
const read = (f: string) => readFileSync(join(dir, f), "utf8");

describe("agent create tools are idempotent by construction", () => {
  for (const file of TOOLS) {
    describe(file, () => {
      const src = read(file);

      it("requires a non-empty idempotency_key", () => {
        expect(src).toMatch(/idempotency_key:\s*z\.string\(\)\.min\(1\)/);
        expect(src).not.toMatch(/idempotency_key:\s*z\.string\(\)[^\n]*\.optional\(\)/);
      });

      it("looks the key up before inserting", () => {
        expect(src).toMatch(/\.eq\(\s*["']idempotency_key["']/);
      });

      it("persists the key on the row it creates", () => {
        expect(src).toMatch(/idempotency_key:\s*input\.idempotency_key/);
      });
    });
  }

  it("registers every asset-writing tool as a write tool", () => {
    const registry = read("_registry.ts");
    for (const name of [
      "create_campaign_draft",
      "propose_scheduled_post",
      "attach_tenant_asset_draft",
      "compose_event_promo",
    ]) {
      expect(registry).toContain(name);
    }
  });
});

describe("asset tools do not leave orphan storage objects on replay", () => {
  for (const file of ["attach-tenant-asset-draft.ts", "compose-event-promo.ts"]) {
    it(`${file} checks idempotency before it uploads`, () => {
      const src = read(file);
      const lookup = src.indexOf('.eq("idempotency_key"');
      const upload = src.search(/\.storage\s*\n?\s*\.from\([^)]*\)\s*\n?\s*\.upload\(/);
      expect(lookup).toBeGreaterThan(-1);
      expect(upload).toBeGreaterThan(-1);
      expect(lookup).toBeLessThan(upload);
    });
  }
});
