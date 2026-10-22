import { isIsoDate } from "./dates";
import { parseAmount } from "./money";

export interface ClaimFormValues {
  policyNumber: string;
  claimantName: string;
  amount: string;
  incidentDate: string;
  description: string;
}

export type FieldName = keyof ClaimFormValues;

export type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: readonly FieldName[] = [
  "policyNumber",
  "claimantName",
  "amount",
  "incidentDate",
  "description",
];

export function validateClaimForm(values: ClaimFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.policyNumber.trim() === "") {
    errors.policyNumber = "Choose a policy.";
  }
  if (values.claimantName.trim() === "") {
    errors.claimantName = "Enter the claimant's name.";
  }
  if (values.amount.trim() === "") {
    errors.amount = "Enter an amount.";
  } else if (!parseAmount(values.amount).ok) {
    errors.amount =
      "Enter an amount greater than zero with at most two decimal places.";
  }
  if (values.incidentDate.trim() === "") {
    errors.incidentDate = "Enter the incident date.";
  } else if (!isIsoDate(values.incidentDate)) {
    errors.incidentDate = "Enter a valid incident date.";
  }
  if (values.description.trim() === "") {
    errors.description = "Enter a description.";
  }
  return errors;
}

export function firstInvalidField(errors: FieldErrors): FieldName | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return firstInvalidField(errors) !== null;
}
