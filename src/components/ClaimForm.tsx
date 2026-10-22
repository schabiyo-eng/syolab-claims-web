import type { FormEvent } from "react";
import type { Policy } from "../api/types";
import type { ClaimFormValues, FieldErrors, FieldName } from "../domain/validation";
import { policyStatusLabel } from "../domain/status";

interface ClaimFormProps {
  policies: Policy[];
  policy: Policy | null;
  values: ClaimFormValues;
  documents: readonly string[];
  errors: FieldErrors;
  submitting: boolean;
  submitError: string | null;
  confirmation: string | null;
  onChange: (field: FieldName, value: string) => void;
  onToggleDocument: (name: string) => void;
  onSubmit: () => void;
}

export function ClaimForm({
  policies,
  policy,
  values,
  documents,
  errors,
  submitting,
  submitError,
  confirmation,
  onChange,
  onToggleDocument,
  onSubmit,
}: ClaimFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form id="claim-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="policyNumber">Policy</label>
        <select
          id="policyNumber"
          value={values.policyNumber}
          onChange={(event) => onChange("policyNumber", event.target.value)}
          aria-invalid={errors.policyNumber ? true : undefined}
          aria-describedby={errors.policyNumber ? "policyNumber-error" : undefined}
        >
          <option value="">Select a policy</option>
          {policies.map((item) => (
            <option key={item.policyNumber} value={item.policyNumber}>
              {item.policyNumber} · {item.holderName}
            </option>
          ))}
        </select>
        {errors.policyNumber ? (
          <p id="policyNumber-error" className="field-error">
            {errors.policyNumber}
          </p>
        ) : null}
      </div>

      {policy ? (
        <dl className="summary">
          <dt>Holder</dt>
          <dd>{policy.holderName}</dd>
          <dt>Status</dt>
          <dd>{policyStatusLabel(policy.status)}</dd>
          <dt>Coverage limit</dt>
          <dd>{policy.coverageLimit}</dd>
          <dt>Required documents</dt>
          <dd>{policy.requiredDocuments.join(", ")}</dd>
        </dl>
      ) : null}

      <div className="field">
        <label htmlFor="claimantName">Claimant</label>
        <input
          id="claimantName"
          value={values.claimantName}
          onChange={(event) => onChange("claimantName", event.target.value)}
          autoComplete="name"
          aria-invalid={errors.claimantName ? true : undefined}
          aria-describedby={errors.claimantName ? "claimantName-error" : undefined}
        />
        {errors.claimantName ? (
          <p id="claimantName-error" className="field-error">
            {errors.claimantName}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          inputMode="decimal"
          value={values.amount}
          onChange={(event) => onChange("amount", event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? "amount-error" : undefined}
        />
        {errors.amount ? (
          <p id="amount-error" className="field-error">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="incidentDate">Incident date</label>
        <input
          id="incidentDate"
          type="date"
          value={values.incidentDate}
          onChange={(event) => onChange("incidentDate", event.target.value)}
          aria-invalid={errors.incidentDate ? true : undefined}
          aria-describedby={errors.incidentDate ? "incidentDate-error" : undefined}
        />
        {errors.incidentDate ? (
          <p id="incidentDate-error" className="field-error">
            {errors.incidentDate}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? "description-error" : undefined}
        />
        {errors.description ? (
          <p id="description-error" className="field-error">
            {errors.description}
          </p>
        ) : null}
      </div>

      <fieldset className="documents">
        <legend>Documents</legend>
        {policy && policy.requiredDocuments.length > 0 ? (
          <div className="docs">
            {policy.requiredDocuments.map((name) => (
              <label key={name} className="doc">
                <input
                  type="checkbox"
                  checked={documents.includes(name)}
                  onChange={() => onToggleDocument(name)}
                />
                {name}
              </label>
            ))}
          </div>
        ) : (
          <p className="meta">Select a policy to see its required documents.</p>
        )}
      </fieldset>

      {submitError ? (
        <p className="alert" role="alert">
          {submitError}
        </p>
      ) : null}
      {confirmation ? (
        <p className="confirmation" role="status">
          {confirmation}
        </p>
      ) : null}

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
