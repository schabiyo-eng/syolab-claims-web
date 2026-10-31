import { describe, expect, it } from "vitest";
import { canSee, type Scope } from "./access";

describe("canSee", () => {
  it("lets an all scope see every policy", () => {
    const scope: Scope = { kind: "all" };
    expect(canSee(scope, "POL-1001")).toBe(true);
    expect(canSee(scope, "POL-9999")).toBe(true);
  });

  it("limits a policies scope to its own policy numbers", () => {
    const scope: Scope = { kind: "policies", policyNumbers: new Set(["POL-1001"]) };
    expect(canSee(scope, "POL-1001")).toBe(true);
    expect(canSee(scope, "POL-1002")).toBe(false);
    expect(canSee(scope, "pol-1001")).toBe(false);
  });

  it("sees nothing with an empty policies scope", () => {
    const scope: Scope = { kind: "policies", policyNumbers: new Set() };
    expect(canSee(scope, "POL-1001")).toBe(false);
  });
});
