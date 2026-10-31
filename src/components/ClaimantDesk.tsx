import { useEffect, useState } from "react";
import { createClaim, listClaims, listPolicies } from "../api/client";
import type { Claim, Policy } from "../api/types";
import { newestFirst } from "../domain/claims";
import {
  firstInvalidField,
  hasFieldErrors,
  validateClaimForm,
  type ClaimFormValues,
  type FieldErrors,
  type FieldName,
} from "../domain/validation";
import { ClaimForm } from "./ClaimForm";
import { ClaimsList } from "./ClaimsList";
import { messageOf, type LoadState } from "./loadState";

const EMPTY_FORM: ClaimFormValues = {
  policyNumber: "",
  claimantName: "",
  amount: "",
  incidentDate: "",
  description: "",
};

export function ClaimantDesk() {
  const [policies, setPolicies] = useState<LoadState<Policy[]>>({ kind: "loading" });
  const [claims, setClaims] = useState<LoadState<Claim[]>>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState<ClaimFormValues>(EMPTY_FORM);
  const [documents, setDocuments] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPolicies({ kind: "loading" });
    setClaims({ kind: "loading" });

    void listPolicies()
      .then((data) => {
        if (!cancelled) {
          setPolicies({ kind: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPolicies({ kind: "error", message: messageOf(error) });
        }
      });

    void listClaims()
      .then((data) => {
        if (!cancelled) {
          setClaims({ kind: "ready", data: newestFirst(data) });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setClaims({ kind: "error", message: messageOf(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (policies.kind !== "ready" || form.policyNumber !== "") {
      return;
    }
    const first = policies.data[0];
    if (first) {
      setForm((current) => ({ ...current, policyNumber: first.policyNumber }));
    }
  }, [policies, form.policyNumber]);

  const selected =
    policies.kind === "ready"
      ? (policies.data.find((policy) => policy.policyNumber === form.policyNumber) ??
        null)
      : null;

  function updateField(field: FieldName, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setConfirmation(null);
    if (field === "policyNumber") {
      setDocuments([]);
    }
    setErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggleDocument(name: string) {
    setDocuments((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
    setConfirmation(null);
  }

  async function refreshClaims() {
    const data = await listClaims();
    setClaims({ kind: "ready", data: newestFirst(data) });
  }

  async function submit() {
    const nextErrors = validateClaimForm(form);
    setErrors(nextErrors);
    setSubmitError(null);
    if (hasFieldErrors(nextErrors)) {
      const field = firstInvalidField(nextErrors);
      if (field) {
        document.getElementById(field)?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      await createClaim({
        policyNumber: form.policyNumber.trim(),
        claimantName: form.claimantName.trim(),
        amount: form.amount.trim(),
        incidentDate: form.incidentDate,
        description: form.description.trim(),
        documentNames: documents,
      });
      await refreshClaims();
      setForm((current) => ({
        ...EMPTY_FORM,
        policyNumber: current.policyNumber,
      }));
      setDocuments([]);
      setConfirmation("Claim stored.");
    } catch (error: unknown) {
      setSubmitError(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="layout">
      <section className="panel" aria-labelledby="new-claim-heading">
        <h2 id="new-claim-heading">New claim</h2>
        {policies.kind === "loading" ? (
          <p className="state">Loading policies…</p>
        ) : null}
        {policies.kind === "error" ? (
          <div className="state">
            <p className="alert" role="alert">
              Could not load policies. {policies.message}
            </p>
            <button
              type="button"
              className="retry"
              onClick={() => setReloadToken((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}
        {policies.kind === "ready" ? (
          <ClaimForm
            policies={policies.data}
            policy={selected}
            values={form}
            documents={documents}
            errors={errors}
            submitting={submitting}
            submitError={submitError}
            confirmation={confirmation}
            onChange={updateField}
            onToggleDocument={toggleDocument}
            onSubmit={() => {
              void submit();
            }}
          />
        ) : null}
      </section>
      <section className="panel" aria-labelledby="claims-heading">
        <h2 id="claims-heading">My claims</h2>
        {claims.kind === "loading" ? <p className="state">Loading claims…</p> : null}
        {claims.kind === "error" ? (
          <div className="state">
            <p className="alert" role="alert">
              Could not load claims. {claims.message}
            </p>
            <button
              type="button"
              className="retry"
              onClick={() => setReloadToken((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}
        {claims.kind === "ready" ? <ClaimsList claims={claims.data} /> : null}
      </section>
    </main>
  );
}
