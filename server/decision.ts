import type { ClaimDetail, DecisionChoice } from "../src/api/types";
import { isFinal } from "../src/domain/decision";

export interface DecisionInput {
  decision: DecisionChoice;
  note: string | null;
}

export type DecideResult =
  { ok: true; claim: ClaimDetail } | { ok: false; reason: "final" };

export function decide(
  claim: ClaimDetail,
  request: DecisionInput,
  actor: string,
  at: string,
): DecideResult {
  if (isFinal(claim.decision)) {
    return { ok: false, reason: "final" };
  }
  return {
    ok: true,
    claim: {
      ...claim,
      decision: request.decision,
      history: [
        ...claim.history,
        {
          at,
          actor,
          action: "DECIDED",
          fromDecision: claim.decision,
          toDecision: request.decision,
          note: request.note,
        },
      ],
    },
  };
}
