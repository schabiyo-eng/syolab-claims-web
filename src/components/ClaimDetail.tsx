import { useEffect, useState } from "react";
import {
  ApiError,
  decideClaim,
  getClaim,
  listComments,
  postComment,
} from "../api/client";
import type { Claim, Comment, DecisionChoice, Role } from "../api/types";
import { commentError } from "../domain/comments";
import { noteError } from "../domain/decision";
import {
  CLAIM_DETAIL_ID,
  ClaimDetailView,
  type CommentFormState,
  type DecisionFormState,
} from "./ClaimDetailView";
import { messageOf, type LoadState } from "./loadState";
import { RouteLink } from "./RouteLink";

interface ClaimDetailProps {
  id: string;
  role: Role;
}

interface Loaded {
  claim: Claim;
  comments: Comment[];
}

type DetailState = LoadState<Loaded> | { kind: "notFound" };

const IDLE_DECISION: DecisionFormState = {
  note: "",
  noteError: null,
  apiError: null,
  pending: false,
};

const IDLE_COMMENT: CommentFormState = {
  text: "",
  textError: null,
  apiError: null,
  pending: false,
};

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404;
}

export function ClaimDetail({ id, role }: ClaimDetailProps) {
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>(IDLE_DECISION);
  const [commentForm, setCommentForm] = useState<CommentFormState>(IDLE_COMMENT);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    void Promise.all([getClaim(id), listComments(id)])
      .then(([claim, comments]) => {
        if (!cancelled) {
          setState({ kind: "ready", data: { claim, comments } });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState(
            isNotFound(error)
              ? { kind: "notFound" }
              : { kind: "error", message: messageOf(error) },
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  function replaceClaim(claim: Claim) {
    setState((current) =>
      current.kind === "ready"
        ? { kind: "ready", data: { ...current.data, claim } }
        : current,
    );
  }

  async function decide(decision: DecisionChoice) {
    const note = decisionForm.note.trim();
    const error = noteError(decision, note);
    if (error) {
      setDecisionForm((current) => ({ ...current, noteError: error, apiError: null }));
      document.getElementById("decision-note")?.focus();
      return;
    }
    setDecisionForm((current) => ({
      ...current,
      noteError: null,
      apiError: null,
      pending: true,
    }));
    try {
      const claim = await decideClaim(
        id,
        note === "" ? { decision } : { decision, note },
      );
      replaceClaim(claim);
      setDecisionForm(IDLE_DECISION);
    } catch (caught: unknown) {
      setDecisionForm((current) => ({
        ...current,
        apiError: messageOf(caught),
        pending: false,
      }));
      if (caught instanceof ApiError && caught.statusCode === 409) {
        void getClaim(id)
          .then(replaceClaim)
          .catch(() => undefined);
      }
    }
  }

  async function submitComment() {
    const error = commentError(commentForm.text);
    if (error) {
      setCommentForm((current) => ({ ...current, textError: error, apiError: null }));
      document.getElementById("comment-body")?.focus();
      return;
    }
    setCommentForm((current) => ({
      ...current,
      textError: null,
      apiError: null,
      pending: true,
    }));
    try {
      const comment = await postComment(id, commentForm.text.trim());
      setState((current) =>
        current.kind === "ready"
          ? {
              kind: "ready",
              data: { ...current.data, comments: [...current.data.comments, comment] },
            }
          : current,
      );
      setCommentForm(IDLE_COMMENT);
    } catch (caught: unknown) {
      setCommentForm((current) => ({
        ...current,
        apiError: messageOf(caught),
        pending: false,
      }));
    }
  }

  switch (state.kind) {
    case "loading":
      return (
        <main id={CLAIM_DETAIL_ID} className="detail">
          <p className="state">Loading claim…</p>
        </main>
      );
    case "notFound":
      return (
        <main id={CLAIM_DETAIL_ID} className="detail">
          <section className="panel detail-wide">
            <h2>Claim not found.</h2>
            <RouteLink route={{ kind: "home" }} className="back">
              Back to claims
            </RouteLink>
          </section>
        </main>
      );
    case "error":
      return (
        <main id={CLAIM_DETAIL_ID} className="detail">
          <section className="panel detail-wide">
            <p className="alert" role="alert">
              Could not load the claim. {state.message}
            </p>
            <button
              type="button"
              className="retry"
              onClick={() => setReloadToken((n) => n + 1)}
            >
              Retry
            </button>{" "}
            <RouteLink route={{ kind: "home" }} className="back">
              Back to claims
            </RouteLink>
          </section>
        </main>
      );
    case "ready":
      return (
        <ClaimDetailView
          claim={state.data.claim}
          comments={state.data.comments}
          role={role}
          decisionForm={decisionForm}
          commentForm={commentForm}
          onNoteChange={(note) =>
            setDecisionForm((current) => ({ ...current, note, noteError: null }))
          }
          onDecide={(decision) => {
            void decide(decision);
          }}
          onCommentChange={(text) =>
            setCommentForm((current) => ({ ...current, text, textError: null }))
          }
          onPostComment={() => {
            void submitComment();
          }}
        />
      );
  }
}
