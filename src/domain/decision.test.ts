import { describe, expect, it } from "vitest";
import {
  DECISION_ACTIONS,
  decisionLabel,
  historyActionText,
  isFinal,
  latestDecisionNote,
  noteError,
} from "./decision";

describe("decisionLabel", () => {
  it("names each decision in words", () => {
    expect(decisionLabel("PENDING")).toBe("Pending");
    expect(decisionLabel("APPROVED")).toBe("Approved");
    expect(decisionLabel("DENIED")).toBe("Denied");
    expect(decisionLabel("INFO_REQUESTED")).toBe("Info requested");
  });
});

describe("isFinal", () => {
  it("treats only approved and denied as final", () => {
    expect(isFinal("APPROVED")).toBe(true);
    expect(isFinal("DENIED")).toBe(true);
    expect(isFinal("PENDING")).toBe(false);
    expect(isFinal("INFO_REQUESTED")).toBe(false);
  });
});

describe("DECISION_ACTIONS", () => {
  it("lists approve, deny, and request info in order with their note rules", () => {
    expect(DECISION_ACTIONS).toEqual([
      { decision: "APPROVED", label: "Approve", noteRequired: false },
      { decision: "DENIED", label: "Deny", noteRequired: true },
      { decision: "INFO_REQUESTED", label: "Request info", noteRequired: true },
    ]);
  });
});

describe("noteError", () => {
  it("requires a non-blank note for deny and request info", () => {
    expect(noteError("DENIED", "")).toBeTruthy();
    expect(noteError("DENIED", "   ")).toBeTruthy();
    expect(noteError("INFO_REQUESTED", "\n")).toBeTruthy();
    expect(noteError("DENIED", "Expired policy")).toBeNull();
  });

  it("lets approve go without a note", () => {
    expect(noteError("APPROVED", "")).toBeNull();
    expect(noteError("APPROVED", "Looks good")).toBeNull();
  });
});

describe("historyActionText", () => {
  it("describes a submission and a decision change", () => {
    expect(
      historyActionText({
        action: "SUBMITTED",
        fromDecision: null,
        toDecision: "PENDING",
      }),
    ).toBe("Submitted");
    expect(
      historyActionText({
        action: "DECIDED",
        fromDecision: "PENDING",
        toDecision: "INFO_REQUESTED",
      }),
    ).toBe("Pending → Info requested");
  });
});

describe("latestDecisionNote", () => {
  const base = { at: "2026-01-01T00:00:00Z", actor: "Dana Wells" } as const;

  it("returns the note of the newest decision", () => {
    expect(
      latestDecisionNote([
        {
          ...base,
          action: "SUBMITTED",
          fromDecision: null,
          toDecision: "PENDING",
          note: null,
        },
        {
          ...base,
          action: "DECIDED",
          fromDecision: "PENDING",
          toDecision: "INFO_REQUESTED",
          note: "Send the bill.",
        },
        {
          ...base,
          action: "DECIDED",
          fromDecision: "INFO_REQUESTED",
          toDecision: "INFO_REQUESTED",
          note: "Send the clinic receipt too.",
        },
      ]),
    ).toBe("Send the clinic receipt too.");
  });

  it("returns null without a decision", () => {
    expect(
      latestDecisionNote([
        {
          ...base,
          action: "SUBMITTED",
          fromDecision: null,
          toDecision: "PENDING",
          note: null,
        },
      ]),
    ).toBeNull();
  });
});
