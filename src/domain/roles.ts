import type { Role } from "../api/types";

const ROLE_LABELS: Record<Role, string> = {
  CLAIMANT: "Claimant",
  ADJUSTER: "Adjuster",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
