import { describe, expect, it } from "vitest";
import { roleLabel } from "./roles";

describe("roleLabel", () => {
  it("names each role in words", () => {
    expect(roleLabel("CLAIMANT")).toBe("Claimant");
    expect(roleLabel("ADJUSTER")).toBe("Adjuster");
  });
});
