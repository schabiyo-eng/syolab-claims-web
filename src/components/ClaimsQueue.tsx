import { useEffect, useState } from "react";
import { listClaims } from "../api/client";
import type { Claim } from "../api/types";
import { newestFirst } from "../domain/claims";
import { STATUS_FILTERS, filterClaims, type QueueFilter } from "../domain/queue";
import { ClaimsList } from "./ClaimsList";
import { messageOf, type LoadState } from "./loadState";

const ALL_CLAIMS: QueueFilter = { status: "ALL", query: "" };

export function ClaimsQueue() {
  const [claims, setClaims] = useState<LoadState<Claim[]>>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [filter, setFilter] = useState<QueueFilter>(ALL_CLAIMS);

  useEffect(() => {
    let cancelled = false;
    setClaims({ kind: "loading" });

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

  const visible = claims.kind === "ready" ? filterClaims(claims.data, filter) : [];

  return (
    <main className="layout">
      <section
        id="claims-queue"
        className="panel queue"
        aria-labelledby="claims-queue-heading"
      >
        <h2 id="claims-queue-heading">Claims queue</h2>
        <div className="queue-toolbar">
          <div className="queue-filters" role="group" aria-label="Status">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="queue-filter"
                aria-pressed={filter.status === option.value}
                onClick={() =>
                  setFilter((current) => ({ ...current, status: option.value }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="field queue-search">
            <label htmlFor="queue-search">Search claimant or policy</label>
            <input
              id="queue-search"
              type="search"
              value={filter.query}
              onChange={(event) => {
                const query = event.target.value;
                setFilter((current) => ({ ...current, query }));
              }}
            />
          </div>
        </div>
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
        {claims.kind === "ready" ? (
          <>
            <p className="state queue-count" role="status">
              Showing {visible.length} of {claims.data.length} claims
            </p>
            {claims.data.length > 0 && visible.length === 0 ? (
              <p className="state">No claims match these filters.</p>
            ) : (
              <ClaimsList claims={visible} />
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
