import { describe, expect, it } from "vitest";
import { parseCommentRequest, parseCreateClaim, parseDecisionRequest } from "./request";

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

describe("parseDecisionRequest", () => {
  it("accepts approve with or without a note and trims the note", () => {
    expect(parseDecisionRequest({ decision: "APPROVED" })).toEqual({
      ok: true,
      request: { decision: "APPROVED", note: null },
    });
    expect(parseDecisionRequest({ decision: "APPROVED", note: "  " })).toEqual({
      ok: true,
      request: { decision: "APPROVED", note: null },
    });
    expect(parseDecisionRequest({ decision: "DENIED", note: " Expired. " })).toEqual({
      ok: true,
      request: { decision: "DENIED", note: "Expired." },
    });
    expect(
      parseDecisionRequest({ decision: "INFO_REQUESTED", note: "Send the bill." }).ok,
    ).toBe(true);
  });

  it("requires a non-blank note for deny and request info", () => {
    for (const decision of ["DENIED", "INFO_REQUESTED"]) {
      expect(parseDecisionRequest({ decision }).ok).toBe(false);
      expect(parseDecisionRequest({ decision, note: "" }).ok).toBe(false);
      expect(parseDecisionRequest({ decision, note: "   " }).ok).toBe(false);
    }
  });

  it("rejects pending, an unknown decision, a bad note, and a non-object body", () => {
    expect(parseDecisionRequest({ decision: "PENDING" }).ok).toBe(false);
    expect(parseDecisionRequest({ decision: "approved" }).ok).toBe(false);
    expect(parseDecisionRequest({}).ok).toBe(false);
    expect(parseDecisionRequest({ decision: "APPROVED", note: 5 }).ok).toBe(false);
    expect(parseDecisionRequest(null).ok).toBe(false);
    expect(parseDecisionRequest([]).ok).toBe(false);
  });
});

describe("parseCommentRequest", () => {
  it("accepts a body and trims it", () => {
    expect(parseCommentRequest({ body: "  I have uploaded the bill. " })).toEqual({
      ok: true,
      body: "I have uploaded the bill.",
    });
    expect(parseCommentRequest({ body: "x".repeat(5000) })).toEqual({
      ok: true,
      body: "x".repeat(5000),
    });
  });

  it("rejects a missing, blank, or non-string body", () => {
    expect(parseCommentRequest({}).ok).toBe(false);
    expect(parseCommentRequest({ body: "" }).ok).toBe(false);
    expect(parseCommentRequest({ body: "  \n " }).ok).toBe(false);
    expect(parseCommentRequest({ body: 12 }).ok).toBe(false);
    expect(parseCommentRequest("hello").ok).toBe(false);
  });
});
