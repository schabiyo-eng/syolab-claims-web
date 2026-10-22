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

  it("lists claims newest first", () => {
    expect(
      store()
        .listClaims()
        .map((claim) => claim.claimantName),
    ).toEqual([
      "Nora Blake",
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
