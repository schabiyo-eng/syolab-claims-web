import { describe, expect, it } from "vitest";
import { newestFirst } from "./claims";

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
