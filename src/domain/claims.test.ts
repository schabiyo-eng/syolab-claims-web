import { describe, expect, it } from "vitest";
import { newestFirst, shortId } from "./claims";

describe("newestFirst", () => {
  it("orders claims by createdAt descending", () => {
    const ordered = newestFirst([
      { id: "older", createdAt: "2026-01-20T15:00:00Z" },
      { id: "newer", createdAt: "2026-05-01T15:00:00Z" },
      { id: "middle", createdAt: "2026-03-12T15:00:00Z" },
    ]);
    expect(ordered.map((claim) => claim.id)).toEqual(["newer", "middle", "older"]);
  });
});

describe("shortId", () => {
  it("keeps the first block of a claim id", () => {
    expect(shortId("c3333333-3333-4333-8333-333333333333")).toBe("c3333333");
    expect(shortId("abc")).toBe("abc");
  });
});
