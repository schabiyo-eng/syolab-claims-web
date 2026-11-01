import { describe, expect, it } from "vitest";
import { hasFieldErrors, validateClaimForm, type ClaimFormValues } from "./validation";

function values(overrides: Partial<ClaimFormValues> = {}): ClaimFormValues {
  return {
    policyNumber: "POL-1002",
    claimantName: "Luis Ortega",
    amount: "100.00",
    incidentDate: "2026-06-01",
    description: "Follow up visit",
    ...overrides,
  };
}

describe("validateClaimForm", () => {
  it("accepts a complete claim", () => {
    expect(validateClaimForm(values())).toEqual({});
  });

  it.each(["10000", "10000.0", "10000.00", "0.01", "250.5"])(
    "accepts amount %s",
    (amount) => {
      expect(validateClaimForm(values({ amount })).amount).toBeUndefined();
    },
  );

  it.each(["", "0", "0.00", "-1", "10.001", "10000.000", "abc", "1e2", "10."])(
    "rejects amount %s",
    (amount) => {
      const errors = validateClaimForm(values({ amount }));
      expect(errors.amount).toBeTruthy();
    },
  );

  it("requires a policy, claimant, description, and incident date", () => {
    const errors = validateClaimForm(
      values({
        policyNumber: "  ",
        claimantName: "",
        description: " ",
        incidentDate: "",
      }),
    );
    expect(errors.policyNumber).toBeTruthy();
    expect(errors.claimantName).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.incidentDate).toBeTruthy();
    expect(hasFieldErrors(errors)).toBe(true);
  });

  it("rejects an impossible incident date", () => {
    expect(
      validateClaimForm(values({ incidentDate: "2026-02-31" })).incidentDate,
    ).toBeTruthy();
    expect(
      validateClaimForm(values({ incidentDate: "06/01/2026" })).incidentDate,
    ).toBeTruthy();
  });

  it.each(["1,250.00", "$1,250.00"])("accepts formatted amount %s", (amount) => {
    expect(validateClaimForm(values({ amount })).amount).toBeUndefined();
  });

  it.each(["$0.00", "-1,250.00", "1,250.000"])(
    "rejects formatted amount %s",
    (amount) => {
      expect(validateClaimForm(values({ amount })).amount).toBeTruthy();
    },
  );
});
