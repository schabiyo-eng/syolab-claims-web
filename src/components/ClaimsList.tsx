import type { Claim } from "../api/types";
import { statusLabel } from "../domain/status";
import { DecisionBadge } from "./DecisionBadge";
import { RouteLink } from "./RouteLink";

interface ClaimsListProps {
  claims: Claim[];
}

export function ClaimsList({ claims }: ClaimsListProps) {
  if (claims.length === 0) {
    return <p className="state">No claims yet.</p>;
  }

  return (
    <ul className="claim-list">
      {claims.map((claim) => {
        const codes = claim.findings.map((finding) => finding.code);
        return (
          <li key={claim.id}>
            <article className="claim">
              <div className="claim-top">
                <h3>
                  <RouteLink
                    route={{ kind: "claim", id: claim.id }}
                    className="claim-link"
                  >
                    {claim.claimantName}
                  </RouteLink>
                </h3>
                <div className="badges">
                  <p className={`status status-${claim.status.toLowerCase()}`}>
                    {statusLabel(claim.status)}
                  </p>
                  <DecisionBadge decision={claim.decision} />
                </div>
              </div>
              <p className="meta">
                {claim.policyNumber} · {claim.amount} · {claim.incidentDate}
              </p>
              <p className="description">{claim.description}</p>
              <p className="findings">
                Findings: {codes.length > 0 ? codes.join(", ") : "none"}
              </p>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
