import { describe, expect, it } from "vitest";
import { parseRoute, pathOf } from "./routing";

const ID = "c3333333-3333-4333-8333-333333333333";

describe("parseRoute", () => {
  it("reads a claim path", () => {
    expect(parseRoute(`/claims/${ID}`)).toEqual({ kind: "claim", id: ID });
    expect(parseRoute(`/claims/${ID}/`)).toEqual({ kind: "claim", id: ID });
  });

  it("decodes an encoded id", () => {
    expect(parseRoute("/claims/a%20b")).toEqual({ kind: "claim", id: "a b" });
  });

  it("treats anything else as home", () => {
    for (const path of [
      "/",
      "",
      "/claims",
      "/claims/",
      "/claims/a/b",
      "/other",
      "/claims/%E0%A4%A",
    ]) {
      expect(parseRoute(path)).toEqual({ kind: "home" });
    }
  });
});

describe("pathOf", () => {
  it("builds paths that parse back to the same route", () => {
    expect(pathOf({ kind: "home" })).toBe("/");
    expect(pathOf({ kind: "claim", id: ID })).toBe(`/claims/${ID}`);
    expect(pathOf({ kind: "claim", id: "a/b" })).toBe("/claims/a%2Fb");
    expect(parseRoute(pathOf({ kind: "claim", id: "a/b" }))).toEqual({
      kind: "claim",
      id: "a/b",
    });
  });
});
