import type { Claim } from "../api/types";
import { statusLabel } from "../domain/status";

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
                <h3>{claim.claimantName}</h3>
                <p className={`status status-${claim.status.toLowerCase()}`}>
                  {statusLabel(claim.status)}
                </p>
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
