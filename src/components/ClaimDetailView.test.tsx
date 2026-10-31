import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Claim, Comment, Decision, Role } from "../api/types";
import {
  ClaimDetailView,
  type CommentFormState,
  type DecisionFormState,
} from "./ClaimDetailView";

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

const REQUEST = "Please upload the medical bill for the clinic visit.";

function claim(decision: Decision): Claim {
  const decided = decision !== "PENDING";
  return {
    id: "c3333333-3333-4333-8333-333333333333",
    policyNumber: "POL-1002",
    claimantName: "Luis Ortega",
    amount: "1200.00",
    incidentDate: "2026-04-02",
    description: "Clinic visit",
    documentNames: [],
    status: "FLAGGED",
    findings: [
      {
        code: "MISSING_DOCUMENTS",
        severity: "WARNING",
        message: "A required document is missing.",
      },
    ],
    decision,
    createdAt: "2026-04-02T15:00:00Z",
    history: [
      ...(decided
        ? [
            {
              at: "2026-04-04T09:30:00Z",
              actor: "dana.wells",
              action: "DECIDED" as const,
              fromDecision: "PENDING" as const,
              toDecision: decision,
              note: decision === "APPROVED" ? null : REQUEST,
            },
          ]
        : []),
    ],
  };
}

const COMMENTS: Comment[] = [
  {
    id: "d3333333-3333-4333-8333-333333333333",
    at: "2026-04-04T09:31:00Z",
    author: "dana.wells",
    role: "ADJUSTER",
    body: REQUEST,
  },
];

function render(role: Role, decision: Decision, comments: Comment[] = COMMENTS) {
  return renderToStaticMarkup(
    <ClaimDetailView
      claim={claim(decision)}
      comments={comments}
      role={role}
      decisionForm={IDLE_DECISION}
      commentForm={IDLE_COMMENT}
      onNoteChange={() => undefined}
      onDecide={() => undefined}
      onCommentChange={() => undefined}
      onPostComment={() => undefined}
    />,
  );
}

function buttons(html: string): { label: string; disabled: boolean }[] {
  return [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map((match) => ({
    label: match[2] ?? "",
    disabled: /\sdisabled=""/.test(match[1] ?? ""),
  }));
}

const DECISION_LABELS = ["Approve", "Deny", "Request info"];

function decisionButtons(html: string) {
  return buttons(html).filter((button) => DECISION_LABELS.includes(button.label));
}

describe("ClaimDetailView", () => {
  it("shows the claim, validation, timeline, and comments panels", () => {
    const html = render("ADJUSTER", "INFO_REQUESTED");
    expect(html).toContain("Back to claims");
    expect(html).toMatch(/<h2[^>]*>Luis Ortega · c3333333<\/h2>/);
    for (const heading of ["Claim", "Validation", "Decision", "Timeline", "Comments"]) {
      expect(html).toMatch(new RegExp(`<h3[^>]*>${heading}</h3>`));
    }
    expect(html).toContain("POL-1002");
    expect(html).toContain("MISSING_DOCUMENTS");
    expect(html).toContain("A required document is missing.");
    expect(html).toContain("Pending → Info requested");
    expect(html).toContain(REQUEST);
    expect(html).toContain('<time dateTime="2026-04-04T09:31:00Z"');
  });

  it("starts the timeline with a submission row from createdAt, then each decision by username", () => {
    const html = render("ADJUSTER", "INFO_REQUESTED");
    const rows = [...html.matchAll(/<ol class="timeline">(.*?)<\/ol>/g)][0]?.[1]?.match(
      /<li.*?<\/li>/g,
    );
    expect(rows).toHaveLength(2);
    expect(rows?.[0]).toContain('<time dateTime="2026-04-02T15:00:00Z"');
    expect(rows?.[0]).toContain("<strong>Submitted</strong>");
    expect(rows?.[0]).not.toContain("dana.wells");
    expect(rows?.[1]).toContain('<time dateTime="2026-04-04T09:30:00Z"');
    expect(rows?.[1]).toContain("dana.wells");
    expect(rows?.[1]).toContain("<strong>Pending → Info requested</strong>");
    expect(html).toMatch(
      /<strong>dana\.wells<\/strong> <span class="comment-role">Adjuster<\/span>/,
    );
  });

  it("keeps every decision button enabled for an adjuster while info is requested", () => {
    const html = render("ADJUSTER", "INFO_REQUESTED");
    expect(decisionButtons(html)).toEqual([
      { label: "Approve", disabled: false },
      { label: "Deny", disabled: false },
      { label: "Request info", disabled: false },
    ]);
    expect(html).not.toContain("This decision is final.");
  });

  it("gives an adjuster three enabled decision buttons and a note field on a pending claim", () => {
    const html = render("ADJUSTER", "PENDING", []);
    expect(decisionButtons(html)).toEqual([
      { label: "Approve", disabled: false },
      { label: "Deny", disabled: false },
      { label: "Request info", disabled: false },
    ]);
    expect(html).toMatch(/<label for="decision-note">Decision note<\/label>/);
    expect(html).not.toContain("This decision is final.");
    expect(html).toContain("No comments yet.");
  });

  it("disables the adjuster's buttons once the decision is final", () => {
    const html = render("ADJUSTER", "APPROVED");
    expect(decisionButtons(html)).toEqual([
      { label: "Approve", disabled: true },
      { label: "Deny", disabled: true },
      { label: "Request info", disabled: true },
    ]);
    expect(html).toContain("This decision is final.");
    expect(html).toContain("Decision: Approved");
  });

  it("shows a claimant the info request and the comment form without decision buttons", () => {
    const html = render("CLAIMANT", "INFO_REQUESTED");
    expect(decisionButtons(html)).toEqual([]);
    expect(html).not.toContain("Decision note");
    expect(html).toContain(
      "The adjuster asked for more information. Reply in the comments below.",
    );
    expect(html).toContain("Decision: Info requested");
    expect(html.match(new RegExp(REQUEST, "g"))?.length).toBeGreaterThanOrEqual(3);
    expect(html).toMatch(/<label for="comment-body">Add a comment<\/label>/);
    expect(buttons(html).map((button) => button.label)).toContain("Post comment");
  });

  it("shows a claimant no info notice for other decisions", () => {
    const html = render("CLAIMANT", "DENIED");
    expect(html).not.toContain("The adjuster asked for more information.");
    expect(html).toContain("Decision: Denied");
    expect(decisionButtons(html)).toEqual([]);
  });

  it("disables every decision button while a decision request runs", () => {
    const html = renderToStaticMarkup(
      <ClaimDetailView
        claim={claim("PENDING")}
        comments={[]}
        role="ADJUSTER"
        decisionForm={{ ...IDLE_DECISION, pending: true }}
        commentForm={IDLE_COMMENT}
        onNoteChange={() => undefined}
        onDecide={() => undefined}
        onCommentChange={() => undefined}
        onPostComment={() => undefined}
      />,
    );
    expect(decisionButtons(html).every((button) => button.disabled)).toBe(true);
  });

  it("renders the inline note error and an API error alert", () => {
    const html = renderToStaticMarkup(
      <ClaimDetailView
        claim={claim("PENDING")}
        comments={[]}
        role="ADJUSTER"
        decisionForm={{
          ...IDLE_DECISION,
          noteError: "Enter a decision note to deny.",
          apiError: "This claim already has a final decision.",
        }}
        commentForm={{ ...IDLE_COMMENT, textError: "Enter a comment." }}
        onNoteChange={() => undefined}
        onDecide={() => undefined}
        onCommentChange={() => undefined}
        onPostComment={() => undefined}
      />,
    );
    expect(html).toContain("Enter a decision note to deny.");
    expect(html).toMatch(
      /role="alert"[^>]*>This claim already has a final decision\.</,
    );
    expect(html).toContain("Enter a comment.");
  });
});
