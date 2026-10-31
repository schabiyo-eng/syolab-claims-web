import type { Decision, DecisionChoice, HistoryEntry } from "../api/types";

const DECISION_LABELS: Record<Decision, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
  INFO_REQUESTED: "Info requested",
};

export interface DecisionAction {
  decision: DecisionChoice;
  label: string;
  noteRequired: boolean;
}

export const DECISION_ACTIONS: readonly DecisionAction[] = [
  { decision: "APPROVED", label: "Approve", noteRequired: false },
  { decision: "DENIED", label: "Deny", noteRequired: true },
  { decision: "INFO_REQUESTED", label: "Request info", noteRequired: true },
];

export function decisionLabel(decision: Decision): string {
  return DECISION_LABELS[decision];
}

export function isFinal(decision: Decision): boolean {
  return decision === "APPROVED" || decision === "DENIED";
}

export function noteRequired(decision: DecisionChoice): boolean {
  return DECISION_ACTIONS.some(
    (action) => action.decision === decision && action.noteRequired,
  );
}

export function noteError(decision: DecisionChoice, note: string): string | null {
  if (noteRequired(decision) && note.trim() === "") {
    return `Enter a decision note to ${decisionVerb(decision)}.`;
  }
  return null;
}

function decisionVerb(decision: DecisionChoice): string {
  switch (decision) {
    case "APPROVED":
      return "approve";
    case "DENIED":
      return "deny";
    case "INFO_REQUESTED":
      return "request info";
  }
}

export function historyActionText(
  entry: Pick<HistoryEntry, "fromDecision" | "toDecision">,
): string {
  return `${decisionLabel(entry.fromDecision)} → ${decisionLabel(entry.toDecision)}`;
}

export function latestDecisionNote(history: readonly HistoryEntry[]): string | null {
  const decided = history.filter((entry) => entry.action === "DECIDED");
  return decided.at(-1)?.note ?? null;
}
