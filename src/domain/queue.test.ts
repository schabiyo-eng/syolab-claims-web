import { describe, expect, it } from "vitest";
import type { Claim } from "../api/types";
import { STATUS_FILTERS, filterClaims } from "./queue";

function claim(
  id: string,
  claimantName: string,
  policyNumber: string,
  status: Claim["status"],
): Claim {
  return {
    id,
    policyNumber,
    claimantName,
    amount: "100.00",
    incidentDate: "2026-01-01",
    description: "Test claim",
    documentNames: [],
    status,
    findings: [],
    createdAt: "2026-01-01T00:00:00Z",
  };
}

const CLAIMS: Claim[] = [
  claim("a", "Nora Blake", "POL-1003", "REJECTED"),
  claim("b", "Amira Shah", "POL-1001", "ACCEPTED"),
  claim("c", "Luis Ortega", "POL-1002", "FLAGGED"),
  claim("d", "Amira Shah", "POL-1001", "REJECTED"),
];

function ids(claims: Claim[]): string[] {
  return claims.map((item) => item.id);
}

describe("filterClaims", () => {
  it("returns every claim in order for ALL and an empty query", () => {
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "" }))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("keeps only the chosen status, preserving order", () => {
    expect(ids(filterClaims(CLAIMS, { status: "REJECTED", query: "" }))).toEqual([
      "a",
      "d",
    ]);
    expect(ids(filterClaims(CLAIMS, { status: "FLAGGED", query: "" }))).toEqual(["c"]);
  });

  it("matches the claimant name case-insensitively", () => {
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "nora" }))).toEqual(["a"]);
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "SHAH" }))).toEqual([
      "b",
      "d",
    ]);
  });

  it("matches the policy number as a substring", () => {
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "pol-1002" }))).toEqual([
      "c",
    ]);
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "100" }))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("trims the query and treats whitespace as empty", () => {
    expect(ids(filterClaims(CLAIMS, { status: "ALL", query: "  nora  " }))).toEqual([
      "a",
    ]);
    expect(filterClaims(CLAIMS, { status: "ALL", query: "   " })).toHaveLength(4);
  });

  it("combines status and query", () => {
    expect(ids(filterClaims(CLAIMS, { status: "REJECTED", query: "amira" }))).toEqual([
      "d",
    ]);
    expect(filterClaims(CLAIMS, { status: "ACCEPTED", query: "nora" })).toEqual([]);
  });

  it("does not match on other fields", () => {
    expect(filterClaims(CLAIMS, { status: "ALL", query: "Test claim" })).toEqual([]);
  });
});

describe("STATUS_FILTERS", () => {
  it("lists All then each status with its label", () => {
    expect(STATUS_FILTERS).toEqual([
      { value: "ALL", label: "All" },
      { value: "ACCEPTED", label: "Accepted" },
      { value: "FLAGGED", label: "Flagged" },
      { value: "REJECTED", label: "Rejected" },
    ]);
  });
});
