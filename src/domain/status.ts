import type { Claim, Policy } from "../api/types";

export function statusLabel(status: Claim["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "Accepted";
    case "FLAGGED":
      return "Flagged";
    case "REJECTED":
      return "Rejected";
  }
}

export function policyStatusLabel(status: Policy["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
  }
}
