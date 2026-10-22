import { describe, expect, it } from "vitest";
import { parseCreateClaim } from "./request";

const valid = {
  policyNumber: "POL-1002",
  claimantName: "Luis Ortega",
  amount: "100.00",
  incidentDate: "2026-06-01",
  description: "Follow up visit",
  documentNames: ["medical-bill"],
};

describe("parseCreateClaim", () => {
  it("accepts 10000, 10000.0, and 10000.00", () => {
    for (const amount of ["10000", "10000.0", "10000.00"]) {
      const parsed = parseCreateClaim({ ...valid, amount });
      expect(parsed.ok).toBe(true);
    }
  });

  it("rejects a missing field, a blank name, a bad amount, and a bad date", () => {
    const withoutName: Record<string, unknown> = { ...valid };
    delete withoutName.claimantName;
    expect(parseCreateClaim(withoutName).ok).toBe(false);
    expect(parseCreateClaim({ ...valid, claimantName: " " }).ok).toBe(false);
    expect(parseCreateClaim({ ...valid, description: "" }).ok).toBe(false);
    expect(parseCreateClaim({ ...valid, amount: "10.999" }).ok).toBe(false);
    expect(parseCreateClaim({ ...valid, amount: 100 }).ok).toBe(false);
    expect(parseCreateClaim({ ...valid, incidentDate: "2026-02-31" }).ok).toBe(false);
  });
});
