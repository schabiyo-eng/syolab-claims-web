import type { FormEvent } from "react";
import type { ClaimDetail, Comment, DecisionChoice, Role } from "../api/types";
import { shortId } from "../domain/claims";
import { MAX_COMMENT_LENGTH } from "../domain/comments";
import { formatDateTime } from "../domain/dates";
import {
  DECISION_ACTIONS,
  historyActionText,
  isFinal,
  latestDecisionNote,
} from "../domain/decision";
import { roleLabel } from "../domain/roles";
import { statusLabel } from "../domain/status";
import { DecisionBadge } from "./DecisionBadge";
import { RouteLink } from "./RouteLink";

export const CLAIM_DETAIL_ID = "claim-detail";

export interface DecisionFormState {
  note: string;
  noteError: string | null;
  apiError: string | null;
  pending: boolean;
}

export interface CommentFormState {
  text: string;
  textError: string | null;
  apiError: string | null;
  pending: boolean;
}

interface ClaimDetailViewProps {
  claim: ClaimDetail;
  comments: readonly Comment[];
  role: Role;
  decisionForm: DecisionFormState;
  commentForm: CommentFormState;
  onNoteChange: (note: string) => void;
  onDecide: (decision: DecisionChoice) => void;
  onCommentChange: (text: string) => void;
  onPostComment: () => void;
}

function Timestamp({ value }: { value: string }) {
  return <time dateTime={value}>{formatDateTime(value)}</time>;
}

export function ClaimDetailView({
  claim,
  comments,
  role,
  decisionForm,
  commentForm,
  onNoteChange,
  onDecide,
  onCommentChange,
  onPostComment,
}: ClaimDetailViewProps) {
  const final = isFinal(claim.decision);
  const requestNote = latestDecisionNote(claim.history);

  function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPostComment();
  }

  return (
    <main id={CLAIM_DETAIL_ID} className="detail">
      <div className="detail-head">
        <RouteLink route={{ kind: "home" }} className="back">
          Back to claims
        </RouteLink>
        <h2>
          {claim.claimantName} · {shortId(claim.id)}
        </h2>
      </div>

      <section className="panel" aria-labelledby="detail-claim-heading">
        <h3 id="detail-claim-heading">Claim</h3>
        <dl className="summary">
          <dt>Policy</dt>
          <dd>{claim.policyNumber}</dd>
          <dt>Claimant</dt>
          <dd>{claim.claimantName}</dd>
          <dt>Amount</dt>
          <dd>{claim.amount}</dd>
          <dt>Incident date</dt>
          <dd>{claim.incidentDate}</dd>
          <dt>Description</dt>
          <dd>{claim.description}</dd>
          <dt>Documents</dt>
          <dd>
            {claim.documentNames.length > 0 ? claim.documentNames.join(", ") : "None"}
          </dd>
          <dt>Submitted at</dt>
          <dd>
            <Timestamp value={claim.createdAt} />
          </dd>
        </dl>
      </section>

      <section className="panel" aria-labelledby="detail-validation-heading">
        <h3 id="detail-validation-heading">Validation</h3>
        <p className={`status status-${claim.status.toLowerCase()} detail-status`}>
          {statusLabel(claim.status)}
        </p>
        {claim.findings.length === 0 ? (
          <p className="state">No findings.</p>
        ) : (
          <ul className="finding-list">
            {claim.findings.map((finding) => (
              <li key={finding.code}>
                <span className="finding-code">{finding.code}</span>
                <span className={`severity severity-${finding.severity.toLowerCase()}`}>
                  {finding.severity === "ERROR" ? "Error" : "Warning"}
                </span>
                <span>{finding.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="detail-decision-heading">
        <h3 id="detail-decision-heading">Decision</h3>
        <DecisionBadge decision={claim.decision} />
        {role === "CLAIMANT" && claim.decision === "INFO_REQUESTED" ? (
          <div className="notice info-request">
            <p>The adjuster asked for more information. Reply in the comments below.</p>
            {requestNote ? <p className="info-request-note">{requestNote}</p> : null}
          </div>
        ) : null}
        {role === "ADJUSTER" ? (
          <form
            className="decision-form"
            onSubmit={(event) => event.preventDefault()}
            noValidate
          >
            <div className="field">
              <label htmlFor="decision-note">Decision note</label>
              <textarea
                id="decision-note"
                value={decisionForm.note}
                disabled={final || decisionForm.pending}
                onChange={(event) => onNoteChange(event.target.value)}
                aria-invalid={decisionForm.noteError ? true : undefined}
                aria-describedby={
                  decisionForm.noteError ? "decision-note-error" : undefined
                }
              />
              {decisionForm.noteError ? (
                <p id="decision-note-error" className="field-error">
                  {decisionForm.noteError}
                </p>
              ) : null}
            </div>
            <div className="decision-actions">
              {DECISION_ACTIONS.map((action) => (
                <button
                  key={action.decision}
                  type="button"
                  className="action"
                  disabled={final || decisionForm.pending}
                  onClick={() => onDecide(action.decision)}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {final ? <p className="state">This decision is final.</p> : null}
            {decisionForm.apiError ? (
              <p className="alert" role="alert">
                {decisionForm.apiError}
              </p>
            ) : null}
          </form>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="detail-timeline-heading">
        <h3 id="detail-timeline-heading">Timeline</h3>
        <ol className="timeline">
          {claim.history.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              <p className="timeline-line">
                <Timestamp value={entry.at} /> · {entry.actor} ·{" "}
                <strong>{historyActionText(entry)}</strong>
              </p>
              {entry.note ? <p className="timeline-note">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel detail-wide" aria-labelledby="detail-comments-heading">
        <h3 id="detail-comments-heading">Comments</h3>
        {comments.length === 0 ? (
          <p className="state">No comments yet.</p>
        ) : (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id}>
                <p className="comment-meta">
                  <strong>{comment.author}</strong>{" "}
                  <span className="comment-role">{roleLabel(comment.role)}</span>{" "}
                  <Timestamp value={comment.at} />
                </p>
                <p className="comment-body">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form className="comment-form" onSubmit={handleCommentSubmit} noValidate>
          <div className="field">
            <label htmlFor="comment-body">Add a comment</label>
            <textarea
              id="comment-body"
              value={commentForm.text}
              maxLength={MAX_COMMENT_LENGTH}
              disabled={commentForm.pending}
              onChange={(event) => onCommentChange(event.target.value)}
              aria-invalid={commentForm.textError ? true : undefined}
              aria-describedby={
                commentForm.textError ? "comment-body-error" : undefined
              }
            />
            {commentForm.textError ? (
              <p id="comment-body-error" className="field-error">
                {commentForm.textError}
              </p>
            ) : null}
          </div>
          {commentForm.apiError ? (
            <p className="alert" role="alert">
              {commentForm.apiError}
            </p>
          ) : null}
          <button type="submit" disabled={commentForm.pending}>
            {commentForm.pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      </section>
    </main>
  );
}
