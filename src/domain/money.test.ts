import { describe, expect, it } from "vitest";
import { centsOfStoredAmount, parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    { input: "1,250.00", cents: 125_000, text: "1250.00" },
    { input: "$1,250.00", cents: 125_000, text: "1250.00" },
    { input: "  $1,250.00  ", cents: 125_000, text: "1250.00" },
    { input: "1,250.5", cents: 125_050, text: "1250.50" },
    { input: "10000", cents: 1_000_000, text: "10000.00" },
    { input: "10000.0", cents: 1_000_000, text: "10000.00" },
    { input: "10000.00", cents: 1_000_000, text: "10000.00" },
    { input: "6000.00", cents: 600_000, text: "6000.00" },
    { input: "0.01", cents: 1, text: "0.01" },
    { input: "250.5", cents: 25_050, text: "250.50" },
    { input: "25,000.00", cents: 2_500_000, text: "25000.00" },
    { input: "$10,000.01", cents: 1_000_001, text: "10000.01" },
  ])("accepts $input", ({ input, cents, text }) => {
    expect(parseAmount(input)).toEqual({ ok: true, cents, text });
  });

  it.each([
    "0",
    "0.00",
    "$0.00",
    "-1",
    "-1,250.00",
    "10.001",
    "1,250.000",
    "1.250,00",
    "1,25.00",
    "$$1,250.00",
    "$ 1,250.00",
    "10.",
    "1e2",
    "90071992547409.92",
  ])("rejects %s", (input) => {
    expect(parseAmount(input)).toEqual({ ok: false });
  });
});

describe("centsOfStoredAmount", () => {
  it("parses canonical stored amounts", () => {
    expect(centsOfStoredAmount("10000.00")).toBe(1_000_000);
    expect(centsOfStoredAmount("6000.00")).toBe(600_000);
  });
});
