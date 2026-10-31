import { describe, expect, it } from "vitest";
import type { ClaimDetail, Decision } from "../src/api/types";
import { decide } from "./decision";

const AT = "2026-06-02T10:00:00.000Z";

function claim(decision: Decision = "PENDING"): ClaimDetail {
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
    history: [
      {
        at: "2026-06-01T10:00:00.000Z",
        actor: "Rae Quinn",
        action: "SUBMITTED",
        fromDecision: null,
        toDecision: "PENDING",
        note: null,
      },
    ],
  };
}

describe("decide", () => {
  it("moves a pending claim and appends a DECIDED entry", () => {
    const before = claim();
    const result = decide(
      before,
      { decision: "DENIED", note: "Expired." },
      "Dana Wells",
      AT,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claim.decision).toBe("DENIED");
    expect(result.claim.history).toEqual([
      before.history[0],
      {
        at: AT,
        actor: "Dana Wells",
        action: "DECIDED",
        fromDecision: "PENDING",
        toDecision: "DENIED",
        note: "Expired.",
      },
    ]);
  });

  it("does not mutate the input claim", () => {
    const before = claim();
    decide(before, { decision: "APPROVED", note: null }, "Dana Wells", AT);
    expect(before.decision).toBe("PENDING");
    expect(before.history).toHaveLength(1);
  });

  it("lets an info request move to any decision, including another request", () => {
    for (const decision of ["APPROVED", "DENIED", "INFO_REQUESTED"] as const) {
      const result = decide(
        claim("INFO_REQUESTED"),
        { decision, note: "Next step." },
        "Dana Wells",
        AT,
      );
      expect(result.ok && result.claim.decision).toBe(decision);
      expect(result.ok && result.claim.history.at(-1)?.fromDecision).toBe(
        "INFO_REQUESTED",
      );
    }
  });

  it("refuses to change an approved or denied claim", () => {
    for (const final of ["APPROVED", "DENIED"] as const) {
      for (const decision of ["APPROVED", "DENIED", "INFO_REQUESTED"] as const) {
        expect(
          decide(claim(final), { decision, note: "Again." }, "Dana Wells", AT),
        ).toEqual({ ok: false, reason: "final" });
      }
    }
  });
});
