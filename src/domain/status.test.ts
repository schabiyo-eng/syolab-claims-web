import { describe, expect, it } from "vitest";
import { policyStatusLabel, statusLabel } from "./status";

describe("statusLabel", () => {
  it("names each claim status in words", () => {
    expect(statusLabel("ACCEPTED")).toBe("Accepted");
    expect(statusLabel("FLAGGED")).toBe("Flagged");
    expect(statusLabel("REJECTED")).toBe("Rejected");
  });
});

describe("policyStatusLabel", () => {
  it("names each policy status in words", () => {
    expect(policyStatusLabel("ACTIVE")).toBe("Active");
    expect(policyStatusLabel("EXPIRED")).toBe("Expired");
    expect(policyStatusLabel("CANCELLED")).toBe("Cancelled");
  });
});
