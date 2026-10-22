import type { Claim, Policy, ValidationFinding } from "../src/api/types";
import { centsOfStoredAmount } from "../src/domain/money";
import type { Clock } from "./clock";
import type { SeedClaim } from "./seed";

const FRAUD_AMOUNT_CENTS = 2_500_000;

export interface NewClaim {
  policyNumber: string;
  claimantName: string;
  amount: string;
  incidentDate: string;
  description: string;
  documentNames: string[];
  id?: string;
  createdAt?: string;
}

function finding(
  code: ValidationFinding["code"],
  severity: ValidationFinding["severity"],
  message: string,
): ValidationFinding {
  return { code, severity, message };
}

function missingRequiredDocument(
  policy: Policy,
  documentNames: readonly string[],
): boolean {
  const provided = new Set(documentNames.map((name) => name.toLowerCase()));
  return policy.requiredDocuments.some(
    (required) => !provided.has(required.toLowerCase()),
  );
}

function possibleFraud(
  amountCents: number,
  description: string,
  incidentDate: string,
  today: string,
): boolean {
  return (
    amountCents >= FRAUD_AMOUNT_CENTS ||
    description.toLowerCase().includes("total loss") ||
    incidentDate > today
  );
}

function statusFrom(findings: readonly ValidationFinding[]): Claim["status"] {
  if (findings.some((item) => item.severity === "ERROR")) {
    return "REJECTED";
  }
  if (findings.some((item) => item.severity === "WARNING")) {
    return "FLAGGED";
  }
  return "ACCEPTED";
}

export function openCents(claims: readonly Claim[], policyNumber: string): number {
  return claims
    .filter(
      (claim) => claim.policyNumber === policyNumber && claim.status !== "REJECTED",
    )
    .reduce((sum, claim) => sum + centsOfStoredAmount(claim.amount), 0);
}

export function adjudicate(
  draft: NewClaim,
  policies: readonly Policy[],
  existing: readonly Claim[],
  clock: Clock,
  identity: { id: string; createdAt: string },
): Claim {
  const amountCents = centsOfStoredAmount(draft.amount);
  const amountText = centsToText(amountCents);
  const policy = policies.find((item) => item.policyNumber === draft.policyNumber);
  const findings: ValidationFinding[] = [];

  if (!policy) {
    findings.push(
      finding("POLICY_NOT_FOUND", "ERROR", "No policy matches this number."),
    );
  } else {
    const outsideTerm =
      draft.incidentDate < policy.effectiveDate ||
      draft.incidentDate > policy.expirationDate;
    const inactive = policy.status !== "ACTIVE" || outsideTerm;
    if (inactive) {
      findings.push(
        finding(
          "POLICY_INACTIVE",
          "ERROR",
          "The policy is not active for this incident date.",
        ),
      );
    } else if (
      openCents(existing, draft.policyNumber) + amountCents >
      centsOfStoredAmount(policy.coverageLimit)
    ) {
      findings.push(
        finding(
          "EXCEEDS_COVERAGE",
          "ERROR",
          "Open claims are above the coverage limit.",
        ),
      );
    }

    if (missingRequiredDocument(policy, draft.documentNames)) {
      findings.push(
        finding("MISSING_DOCUMENTS", "WARNING", "A required document is missing."),
      );
    }
    if (
      possibleFraud(amountCents, draft.description, draft.incidentDate, clock.today())
    ) {
      findings.push(
        finding("POSSIBLE_FRAUD", "WARNING", "This claim needs a fraud review."),
      );
    }
  }

  return {
    id: identity.id,
    policyNumber: draft.policyNumber,
    claimantName: draft.claimantName,
    amount: amountText,
    incidentDate: draft.incidentDate,
    description: draft.description,
    documentNames: [...draft.documentNames],
    status: statusFrom(findings),
    findings,
    createdAt: identity.createdAt,
  };
}

function centsToText(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  return `${dollars}.${String(remainder).padStart(2, "0")}`;
}

export function claimFromSeed(
  seed: SeedClaim,
  policies: readonly Policy[],
  existing: readonly Claim[],
  clock: Clock,
): Claim {
  return adjudicate(seed, policies, existing, clock, {
    id: seed.id,
    createdAt: seed.createdAt,
  });
}
