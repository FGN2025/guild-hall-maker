import { describe, it, expect } from "vitest";
import { normalizeEventTitle } from "../../supabase/functions/_shared/promo/normalizeEventTitle";

const opts = { game: "MECCHA CHAMELEON", dateShown: true, tenantName: "Acme Broadband" };

describe("normalizeEventTitle — leading date parenthetical", () => {
  it("strips a leading (Sep 4) and the trailing suffix, keeping the game in the headline", () => {
    const n = normalizeEventTitle({ ...opts, name: "(Sep 4) MECCHA CHAMELEON Game Night - Sep 4" });
    expect(n.after).toBe("MECCHA CHAMELEON Game Night");
    expect(n.rules).toEqual(["strip_leading_date", "strip_trailing_date"]);
    expect(n.guarded).toBe("bare_descriptor"); // game strip refused
    expect(n.before).toBe("(Sep 4) MECCHA CHAMELEON Game Night - Sep 4");
    expect(n.log).toContain('before="(Sep 4) MECCHA CHAMELEON Game Night - Sep 4"');
  });

  it("strips a leading date with no trailing suffix", () => {
    const n = normalizeEventTitle({ name: "(Sep 2) Overwatch Game Night", game: "Overwatch", dateShown: true });
    expect(n.after).toBe("Overwatch Game Night");
    expect(n.rules).toEqual(["strip_leading_date"]);
  });

  it("never reduces a title to a bare descriptor", () => {
    const n = normalizeEventTitle({ name: "(Sep 8) Game Night", game: "Overwatch", dateShown: true });
    expect(n.after).toBe("(Sep 8) Game Night");
    expect(n.rules).toContain("strip_leading_date_rejected_bare");
  });

  it("keeps the numeric-date form and leaves non-date parentheticals alone", () => {
    expect(normalizeEventTitle({ name: "(9/6) Fortnite Tournament", game: "Fortnite", dateShown: true }).after)
      .toBe("Fortnite Tournament");
    expect(normalizeEventTitle({ name: "May Madness Invitational", game: "Roblox", dateShown: true }).after)
      .toBe("May Madness Invitational");
  });

  it("does nothing when the date is not rendered in the metadata line", () => {
    const n = normalizeEventTitle({ name: "(Sep 4) MECCHA CHAMELEON Game Night - Sep 4", game: "MECCHA CHAMELEON" });
    expect(n.after).toBe("(Sep 4) MECCHA CHAMELEON Game Night - Sep 4");
    expect(n.rules).toEqual([]);
  });
});
