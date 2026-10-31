import type { Claim } from "../api/types";
import { statusLabel } from "./status";

export type StatusFilter = "ALL" | Claim["status"];

export interface QueueFilter {
  status: StatusFilter;
  query: string;
}

export const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  ...(["ACCEPTED", "FLAGGED", "REJECTED"] as const).map((status) => ({
    value: status,
    label: statusLabel(status),
  })),
];

export function filterClaims(claims: readonly Claim[], filter: QueueFilter): Claim[] {
  const query = filter.query.trim().toLowerCase();
  return claims.filter(
    (claim) =>
      (filter.status === "ALL" || claim.status === filter.status) &&
      (query === "" ||
        claim.claimantName.toLowerCase().includes(query) ||
        claim.policyNumber.toLowerCase().includes(query)),
  );
}
