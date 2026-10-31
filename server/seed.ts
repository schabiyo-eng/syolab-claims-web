import type { Comment, Policy } from "../src/api/types";
import type { DecisionInput } from "./decision";

export interface SeedDecision extends DecisionInput {
  actor: string;
  at: string;
}

export interface SeedClaim {
  id: string;
  policyNumber: string;
  claimantName: string;
  amount: string;
  incidentDate: string;
  description: string;
  documentNames: string[];
  createdAt: string;
  decisions?: readonly SeedDecision[];
  comments?: readonly Comment[];
}

const ADJUSTER_NAME = "Dana Wells";
const MEDICAL_BILL_REQUEST = "Please upload the medical bill for the clinic visit.";

export function seedPolicies(): Policy[] {
  return [
    {
      policyNumber: "POL-1001",
      holderName: "Amira Shah",
      status: "ACTIVE",
      coverageLimit: "10000.00",
      effectiveDate: "2025-01-01",
      expirationDate: "2027-12-31",
      requiredDocuments: ["police-report", "repair-estimate"],
    },
    {
      policyNumber: "POL-1002",
      holderName: "Luis Ortega",
      status: "ACTIVE",
      coverageLimit: "50000.00",
      effectiveDate: "2025-01-01",
      expirationDate: "2027-12-31",
      requiredDocuments: ["medical-bill"],
    },
    {
      policyNumber: "POL-1003",
      holderName: "Nora Blake",
      status: "EXPIRED",
      coverageLimit: "20000.00",
      effectiveDate: "2023-01-01",
      expirationDate: "2024-12-31",
      requiredDocuments: ["police-report"],
    },
    {
      policyNumber: "POL-1004",
      holderName: "Chris Dalton",
      status: "ACTIVE",
      coverageLimit: "10000.00",
      effectiveDate: "2025-01-01",
      expirationDate: "2027-12-31",
      requiredDocuments: ["police-report"],
    },
  ];
}

export function seedClaims(): SeedClaim[] {
  return [
    {
      id: "c5555555-5555-4555-8555-555555555555",
      policyNumber: "POL-1004",
      claimantName: "Chris Dalton",
      amount: "10000.00",
      incidentDate: "2026-01-20",
      description: "Parking lot dent",
      documentNames: ["police-report"],
      createdAt: "2026-01-20T15:00:00Z",
      decisions: [
        {
          decision: "APPROVED",
          note: null,
          actor: ADJUSTER_NAME,
          at: "2026-01-22T11:00:00Z",
        },
      ],
    },
    {
      id: "c1111111-1111-4111-8111-111111111111",
      policyNumber: "POL-1001",
      claimantName: "Amira Shah",
      amount: "6000.00",
      incidentDate: "2026-02-01",
      description: "Rear bumper scrape",
      documentNames: ["police-report", "repair-estimate"],
      createdAt: "2026-02-01T15:00:00Z",
    },
    {
      id: "c2222222-2222-4222-8222-222222222222",
      policyNumber: "POL-1001",
      claimantName: "Amira Shah",
      amount: "4000.00",
      incidentDate: "2026-03-12",
      description: "Side mirror cracked",
      documentNames: ["police-report", "repair-estimate"],
      createdAt: "2026-03-12T15:00:00Z",
    },
    {
      id: "c3333333-3333-4333-8333-333333333333",
      policyNumber: "POL-1002",
      claimantName: "Luis Ortega",
      amount: "1200.00",
      incidentDate: "2026-04-02",
      description: "Clinic visit",
      documentNames: [],
      createdAt: "2026-04-02T15:00:00Z",
      decisions: [
        {
          decision: "INFO_REQUESTED",
          note: MEDICAL_BILL_REQUEST,
          actor: ADJUSTER_NAME,
          at: "2026-04-04T09:30:00Z",
        },
      ],
      comments: [
        {
          id: "d3333333-3333-4333-8333-333333333333",
          at: "2026-04-04T09:31:00Z",
          author: ADJUSTER_NAME,
          role: "ADJUSTER",
          body: MEDICAL_BILL_REQUEST,
        },
      ],
    },
    {
      id: "c4444444-4444-4444-8444-444444444444",
      policyNumber: "POL-1003",
      claimantName: "Nora Blake",
      amount: "900.00",
      incidentDate: "2026-05-01",
      description: "Windshield chip",
      documentNames: ["police-report"],
      createdAt: "2026-05-01T15:00:00Z",
      decisions: [
        {
          decision: "DENIED",
          note: "The policy expired before the incident date.",
          actor: ADJUSTER_NAME,
          at: "2026-05-03T10:00:00Z",
        },
      ],
    },
  ];
}
