import type { DecisionChoice } from "../src/api/types";
import { isIsoDate } from "../src/domain/dates";
import { DECISION_ACTIONS, noteRequired } from "../src/domain/decision";
import { parseAmount } from "../src/domain/money";
import type { DecisionInput } from "./decision";
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

export type DecisionParseResult =
  { ok: true; request: DecisionInput } | { ok: false; message: string };

export type CommentParseResult =
  { ok: true; body: string } | { ok: false; message: string };

const DECISION_CHOICES: readonly DecisionChoice[] = DECISION_ACTIONS.map(
  (action) => action.decision,
);

export function parseDecisionRequest(body: unknown): DecisionParseResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  const decision = DECISION_CHOICES.find((choice) => choice === body.decision);
  if (decision === undefined) {
    return {
      ok: false,
      message: "Decision must be APPROVED, DENIED, or INFO_REQUESTED.",
    };
  }
  const rawNote = body.note;
  if (rawNote !== undefined && typeof rawNote !== "string") {
    return { ok: false, message: "Note must be a string." };
  }
  const note = rawNote?.trim() ?? "";
  if (note === "" && noteRequired(decision)) {
    return { ok: false, message: "A note is required for this decision." };
  }
  return { ok: true, request: { decision, note: note === "" ? null : note } };
}

export function parseCommentRequest(body: unknown): CommentParseResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }
  if (typeof body.body !== "string" || body.body.trim() === "") {
    return { ok: false, message: "Comment body is required." };
  }
  return { ok: true, body: body.body.trim() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
