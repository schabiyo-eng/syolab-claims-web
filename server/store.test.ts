import { describe, expect, it } from "vitest";
import type { Policy } from "../src/api/types";
import { fixedClock } from "./clock";
import { createStore } from "./store";

const clock = fixedClock("2026-10-22");

function freshPolicy(): Policy {
  return {
    policyNumber: "POL-2000",
    holderName: "Rae Quinn",
    status: "ACTIVE",
    coverageLimit: "10000.00",
    effectiveDate: "2025-01-01",
    expirationDate: "2027-12-31",
    requiredDocuments: ["police-report"],
  };
}

function draft(
  amount: string,
  overrides: Partial<{
    policyNumber: string;
    documentNames: string[];
    description: string;
    incidentDate: string;
    claimantName: string;
  }> = {},
) {
  return {
    policyNumber: overrides.policyNumber ?? "POL-2000",
    claimantName: overrides.claimantName ?? "Rae Quinn",
    amount,
    incidentDate: overrides.incidentDate ?? "2026-06-01",
    description: overrides.description ?? "Fender scrape",
    documentNames: overrides.documentNames ?? ["police-report"],
  };
}

describe("seeded desk", () => {
  function store() {
    return createStore({ clock });
  }

  it("accepts Chris Dalton at the coverage limit", () => {
    const claim = store().getClaim("c5555555-5555-4555-8555-555555555555");
    expect(claim?.status).toBe("ACCEPTED");
    expect(claim?.amount).toBe("10000.00");
    expect(claim?.findings.some((finding) => finding.severity === "ERROR")).toBe(false);
  });

  it("keeps Amira Shah's accepted claims at the limit", () => {
    const claims = store()
      .listClaims()
      .filter(
        (claim) => claim.policyNumber === "POL-1001" && claim.status === "ACCEPTED",
      );
    expect(claims.map((claim) => claim.amount).sort()).toEqual(["4000.00", "6000.00"]);
  });

  it("flags Luis Ortega for a missing document and rejects Nora Blake", () => {
    const luis = store().getClaim("c3333333-3333-4333-8333-333333333333");
    const nora = store().getClaim("c4444444-4444-4444-8444-444444444444");
    expect(luis?.status).toBe("FLAGGED");
    expect(luis?.findings.map((finding) => finding.code)).toEqual([
      "MISSING_DOCUMENTS",
    ]);
    expect(nora?.status).toBe("REJECTED");
    expect(nora?.findings.map((finding) => finding.code)).toEqual(["POLICY_INACTIVE"]);
  });

  it("accepts Grace Okafor's kitchen claim with no findings", () => {
    const grace = store().getClaim("c6666666-6666-4666-8666-666666666666");
    expect(grace).toMatchObject({
      policyNumber: "POL-1005",
      claimantName: "Grace Okafor",
      amount: "1250.00",
      incidentDate: "2026-04-18",
      description: "Kitchen pipe leak",
      documentNames: ["contractor-estimate"],
      createdAt: "2026-04-18T15:00:00Z",
      status: "ACCEPTED",
      findings: [],
    });
    expect(store().getPolicy("POL-1005")).toEqual({
      policyNumber: "POL-1005",
      holderName: "Grace Okafor",
      status: "ACTIVE",
      coverageLimit: "15000.00",
      effectiveDate: "2025-01-01",
      expirationDate: "2027-12-31",
      requiredDocuments: ["contractor-estimate"],
    });
  });

  it("seeds no decisions or comments", () => {
    const seeded = store();
    const claims = seeded.listClaims();
    expect(claims).toHaveLength(6);
    for (const claim of claims) {
      expect(claim.decision).toBe("PENDING");
      expect(claim.history).toEqual([]);
      expect(seeded.listComments(claim.id)).toEqual([]);
    }
  });

  it("lists claims newest first", () => {
    expect(
      store()
        .listClaims()
        .map((claim) => claim.claimantName),
    ).toEqual([
      "Nora Blake",
      "Grace Okafor",
      "Luis Ortega",
      "Amira Shah",
      "Amira Shah",
      "Chris Dalton",
    ]);
  });

  it("accepts a small follow-up on POL-1002", () => {
    const claim = store().createClaim({
      policyNumber: "POL-1002",
      claimantName: "Luis Ortega",
      amount: "100.00",
      incidentDate: "2026-06-01",
      description: "Follow up visit",
      documentNames: ["medical-bill"],
    });
    expect(claim.status).toBe("ACCEPTED");
    expect(claim.findings).toEqual([]);
  });

  it("rejects a new POL-1001 claim when open claims already fill the limit", () => {
    const claim = store().createClaim({
      policyNumber: "POL-1001",
      claimantName: "Amira Shah",
      amount: "1.00",
      incidentDate: "2026-06-01",
      description: "Another scrape",
      documentNames: ["police-report", "repair-estimate"],
    });
    expect(claim.status).toBe("REJECTED");
    expect(claim.findings.map((finding) => [finding.code, finding.severity])).toEqual([
      ["EXCEEDS_COVERAGE", "ERROR"],
    ]);
  });
});

describe("coverage rules", () => {
  it("accepts an amount equal to the coverage limit", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const claim = store.createClaim(draft("10000.00"));
    expect(claim.status).toBe("ACCEPTED");
    expect(claim.findings.some((finding) => finding.severity === "ERROR")).toBe(false);
  });

  it("rejects one cent over the coverage limit", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const claim = store.createClaim(draft("10000.01"));
    expect(claim.status).toBe("REJECTED");
    expect(claim.findings.map((finding) => finding.code)).toContain("EXCEEDS_COVERAGE");
  });

  it("does not let a rejected claim consume coverage", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const rejected = store.createClaim(draft("15000.00"));
    const accepted = store.createClaim(draft("10000.00"));
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.findings.map((finding) => finding.code)).toContain(
      "EXCEEDS_COVERAGE",
    );
    expect(accepted.status).toBe("ACCEPTED");
  });

  it("stores an unknown policy as rejected", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const claim = store.createClaim(
      draft("100.00", { policyNumber: "POL-404", description: "total loss" }),
    );
    expect(claim.status).toBe("REJECTED");
    expect(claim.findings.map((finding) => finding.code)).toEqual(["POLICY_NOT_FOUND"]);
  });

  it("flags missing documents when coverage is inside the limit", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const claim = store.createClaim(draft("80.00", { documentNames: [] }));
    expect(claim.status).toBe("FLAGGED");
    expect(claim.findings.map((finding) => finding.code)).toEqual([
      "MISSING_DOCUMENTS",
    ]);
  });

  it("flags fraud wording, a high amount, and a future incident date", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const wording = store.createClaim(
      draft("80.00", { description: "Total Loss of the bumper" }),
    );
    expect(wording.status).toBe("FLAGGED");
    expect(wording.findings.map((finding) => finding.code)).toContain("POSSIBLE_FRAUD");

    const wide = createStore({
      clock,
      policies: [{ ...freshPolicy(), coverageLimit: "50000.00" }],
      seeds: [],
    });
    const high = wide.createClaim(draft("25000.00"));
    expect(high.status).toBe("FLAGGED");
    expect(high.findings.map((finding) => finding.code)).toContain("POSSIBLE_FRAUD");

    const future = store.createClaim(draft("80.00", { incidentDate: "2026-10-23" }));
    expect(future.status).toBe("FLAGGED");
    expect(future.findings.map((finding) => finding.code)).toContain("POSSIBLE_FRAUD");
  });
});

describe("decisions and history", () => {
  const LUIS = "c3333333-3333-4333-8333-333333333333";
  const NORA = "c4444444-4444-4444-8444-444444444444";
  const INFO_NOTE = "Please upload the medical bill for the clinic visit.";

  it("starts a new claim pending with an empty history", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const created = store.createClaim(draft("80.00"));
    expect(created.decision).toBe("PENDING");
    expect(created.history).toEqual([]);
    expect(store.getClaim(created.id)?.history).toEqual([]);
  });

  it("returns history on lists, new claims, and one claim", () => {
    const store = createStore({ clock });
    for (const claim of store.listClaims()) {
      expect(Array.isArray(claim.history)).toBe(true);
    }
    expect(store.listClaims().find((claim) => claim.id === LUIS)?.history).toEqual(
      store.getClaim(LUIS)?.history,
    );
    expect(store.createClaim(draft("1.00")).history).toEqual([]);

    store.decideClaim(LUIS, { decision: "INFO_REQUESTED", note: INFO_NOTE }, "dana");
    expect(store.getClaim(LUIS)?.history.length).toBeGreaterThan(0);
    expect(store.listClaims().find((claim) => claim.id === LUIS)?.history).toEqual(
      store.getClaim(LUIS)?.history,
    );
  });

  it("records a denial with its actor and note", () => {
    const store = createStore({ clock });
    const result = store.decideClaim(
      NORA,
      { decision: "DENIED", note: "The policy expired before the incident date." },
      "dana",
    );
    expect(result?.ok).toBe(true);
    const nora = store.getClaim(NORA);
    expect(nora?.decision).toBe("DENIED");
    expect(
      nora?.history.map((entry) => [
        entry.action,
        entry.actor,
        entry.fromDecision,
        entry.toDecision,
        entry.note,
      ]),
    ).toEqual([
      [
        "DECIDED",
        "dana",
        "PENDING",
        "DENIED",
        "The policy expired before the incident date.",
      ],
    ]);
  });

  it("records a decision, keeps history oldest first, and refuses a final change", () => {
    const store = createStore({ clock });
    expect(
      store.decideClaim(LUIS, { decision: "INFO_REQUESTED", note: INFO_NOTE }, "dana")
        ?.ok,
    ).toBe(true);
    const approved = store.decideClaim(
      LUIS,
      { decision: "APPROVED", note: null },
      "dana",
    );
    expect(approved?.ok).toBe(true);
    const after = store.getClaim(LUIS);
    expect(after?.decision).toBe("APPROVED");
    expect(
      after?.history.map((entry) => [entry.fromDecision, entry.toDecision]),
    ).toEqual([
      ["PENDING", "INFO_REQUESTED"],
      ["INFO_REQUESTED", "APPROVED"],
    ]);
    expect(store.listClaims().find((claim) => claim.id === LUIS)?.decision).toBe(
      "APPROVED",
    );

    expect(
      store.decideClaim(LUIS, { decision: "DENIED", note: "Too late." }, "dana"),
    ).toEqual({ ok: false, reason: "final" });
    expect(store.getClaim(LUIS)?.history).toHaveLength(2);
  });

  it("returns undefined when deciding an unknown claim", () => {
    const store = createStore({ clock });
    expect(
      store.decideClaim("missing", { decision: "APPROVED", note: null }, "dana"),
    ).toBeUndefined();
  });

  it("does not let callers change stored history", () => {
    const store = createStore({ clock });
    store.decideClaim(LUIS, { decision: "INFO_REQUESTED", note: INFO_NOTE }, "dana");
    store.getClaim(LUIS)?.history.pop();
    store
      .listClaims()
      .find((claim) => claim.id === LUIS)
      ?.history.pop();
    expect(store.getClaim(LUIS)?.history).toHaveLength(1);
  });
});

describe("comments", () => {
  it("stores comments per claim oldest first", () => {
    const store = createStore({ clock, policies: [freshPolicy()], seeds: [] });
    const first = store.createClaim(draft("80.00"));
    const second = store.createClaim(draft("90.00"));
    expect(store.listComments(first.id)).toEqual([]);

    const posted = store.addComment(first.id, {
      author: "Rae Quinn",
      role: "CLAIMANT",
      body: "Photos attached.",
    });
    store.addComment(first.id, {
      author: "dana",
      role: "ADJUSTER",
      body: "Thanks.",
    });

    expect(posted).toMatchObject({
      author: "Rae Quinn",
      role: "CLAIMANT",
      body: "Photos attached.",
    });
    expect(posted?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.listComments(first.id).map((comment) => comment.body)).toEqual([
      "Photos attached.",
      "Thanks.",
    ]);
    expect(store.listComments(second.id)).toEqual([]);
  });

  it("returns undefined for an unknown claim", () => {
    const store = createStore({ clock, seeds: [] });
    expect(
      store.addComment("missing", { author: "A", role: "CLAIMANT", body: "Hi" }),
    ).toBeUndefined();
    expect(store.listComments("missing")).toEqual([]);
  });
});
