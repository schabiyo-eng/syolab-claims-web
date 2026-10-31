import type { Decision } from "../api/types";
import { decisionLabel } from "../domain/decision";

export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <p className={`decision decision-${decision.toLowerCase().replace("_", "-")}`}>
      Decision: {decisionLabel(decision)}
    </p>
  );
}
