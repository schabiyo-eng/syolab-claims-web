import { isIsoDate } from "../src/domain/dates";
import { parseAmount } from "../src/domain/money";
import type { NewClaim } from "./evaluate";

export type ParseResult =
  { ok: true; claim: NewClaim } | { ok: false; message: string };

const REQUIRED_FIELDS = [
  "policyNumber",
  "claimantName",
  "amount",
  "incidentDate",
  "description",
  "documentNames",
] as const;

export function parseCreateClaim(body: unknown): ParseResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const record = body as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      return { ok: false, message: `${fieldLabel(field)} is required.` };
    }
  }
  if (typeof record.policyNumber !== "string") {
    return { ok: false, message: "Policy number is required." };
  }
  if (typeof record.claimantName !== "string" || record.claimantName.trim() === "") {
    return { ok: false, message: "Claimant name is required." };
  }
  if (typeof record.description !== "string" || record.description.trim() === "") {
    return { ok: false, message: "Description is required." };
  }
  if (typeof record.amount !== "string") {
    return { ok: false, message: "Amount must be a decimal string." };
  }
  if (!parseAmount(record.amount).ok) {
    return {
      ok: false,
      message: "Amount must be greater than zero with at most two decimal places.",
    };
  }
  if (typeof record.incidentDate !== "string" || !isIsoDate(record.incidentDate)) {
    return { ok: false, message: "Incident date must be a calendar date." };
  }
  if (!isStringList(record.documentNames)) {
    return { ok: false, message: "Document names must be a list of strings." };
  }
  return {
    ok: true,
    claim: {
      policyNumber: record.policyNumber.trim(),
      claimantName: record.claimantName.trim(),
      amount: record.amount.trim(),
      incidentDate: record.incidentDate,
      description: record.description.trim(),
      documentNames: record.documentNames,
    },
  };
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function fieldLabel(field: (typeof REQUIRED_FIELDS)[number]): string {
  switch (field) {
    case "policyNumber":
      return "Policy number";
    case "claimantName":
      return "Claimant name";
    case "amount":
      return "Amount";
    case "incidentDate":
      return "Incident date";
    case "description":
      return "Description";
    case "documentNames":
      return "Document names";
  }
}
