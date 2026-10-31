import { describe, expect, it } from "vitest";
import { MAX_COMMENT_LENGTH, commentError } from "./comments";

describe("commentError", () => {
  it("accepts a comment up to the limit", () => {
    expect(commentError("I have uploaded the medical bill.")).toBeNull();
    expect(commentError("x".repeat(MAX_COMMENT_LENGTH))).toBeNull();
  });

  it("rejects a blank or too-long comment", () => {
    expect(commentError("")).toBeTruthy();
    expect(commentError("   ")).toBeTruthy();
    expect(commentError("x".repeat(MAX_COMMENT_LENGTH + 1))).toBeTruthy();
  });
});
