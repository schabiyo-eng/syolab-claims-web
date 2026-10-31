import { describe, expect, it } from "vitest";
import type { Claim, Decision } from "../src/api/types";
import { decide } from "./decision";

const AT = "2026-06-02T10:00:00.000Z";

function claim(decision: Decision = "PENDING"): Claim {
  return {
    id: "c9999999-9999-4999-8999-999999999999",
    policyNumber: "POL-2000",
    claimantName: "Rae Quinn",
    amount: "100.00",
    incidentDate: "2026-06-01",
    description: "Fender scrape",
    documentNames: [],
    status: "ACCEPTED",
    findings: [],
    decision,
    createdAt: "2026-06-01T10:00:00.000Z",
    history: [],
  };
}

describe("decide", () => {
  it("moves a pending claim and appends a DECIDED entry", () => {
    const before = claim();
    const result = decide(
      before,
      { decision: "DENIED", note: "Expired." },
      "dana.wells",
      AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claim.decision).toBe("DENIED");
    expect(result.claim.history).toEqual([
      {
        at: AT,
        actor: "dana.wells",
        action: "DECIDED",
        fromDecision: "PENDING",
        toDecision: "DENIED",
        note: "Expired.",
      },
    ]);
  });

  it("does not mutate the input claim", () => {
    const before = claim();
    decide(before, { decision: "APPROVED", note: null }, "dana.wells", AT);
    expect(before.decision).toBe("PENDING");
    expect(before.history).toHaveLength(0);
  });

  it("lets an info request move to any decision, including another request", () => {
    for (const decision of ["APPROVED", "DENIED", "INFO_REQUESTED"] as const) {
      const result = decide(
        claim("INFO_REQUESTED"),
        { decision, note: "Next step." },
        "dana.wells",
        AT,
      );
      expect(result.ok && result.claim.decision).toBe(decision);
      expect(result.ok && result.claim.history.at(-1)?.fromDecision).toBe(
        "INFO_REQUESTED",
      );
    }
  });

  it("appends a second entry when info is requested again", () => {
    const first = decide(
      claim(),
      { decision: "INFO_REQUESTED", note: "Send the bill." },
      "dana.wells",
      AT,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = decide(
      first.claim,
      { decision: "INFO_REQUESTED", note: "Send the receipt too." },
      "dana.wells",
      "2026-06-03T10:00:00.000Z",
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.claim.decision).toBe("INFO_REQUESTED");
    expect(
      second.claim.history.map((entry) => [entry.fromDecision, entry.toDecision]),
    ).toEqual([
      ["PENDING", "INFO_REQUESTED"],
      ["INFO_REQUESTED", "INFO_REQUESTED"],
    ]);
    expect(second.claim.history.at(-1)).toMatchObject({
      actor: "dana.wells",
      action: "DECIDED",
      note: "Send the receipt too.",
    });
  });

  it("refuses to change an approved or denied claim", () => {
    for (const final of ["APPROVED", "DENIED"] as const) {
      for (const decision of ["APPROVED", "DENIED", "INFO_REQUESTED"] as const) {
        expect(
          decide(claim(final), { decision, note: "Again." }, "dana.wells", AT),
        ).toEqual({ ok: false, reason: "final" });
      }
    }
  });
});
