import { randomUUID } from "node:crypto";
import type { Claim, ClaimDetail, Comment, Policy } from "../src/api/types";
import { newestFirst } from "../src/domain/claims";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { decide, type DecideResult, type DecisionInput } from "./decision";
import { adjudicate, type NewClaim } from "./evaluate";
import { seedClaims, seedPolicies, type SeedClaim } from "./seed";

export interface StoreOptions {
  clock?: Clock;
  policies?: Policy[];
  seeds?: SeedClaim[];
}

export type NewComment = Pick<Comment, "author" | "role" | "body">;

export interface ClaimStore {
  listPolicies(): Policy[];
  getPolicy(policyNumber: string): Policy | undefined;
  listClaims(): Claim[];
  getClaim(id: string): ClaimDetail | undefined;
  /** `actor` is the submitting user's display name. It defaults to the claimant name. */
  createClaim(draft: NewClaim, actor?: string): Claim;
  decideClaim(
    id: string,
    request: DecisionInput,
    actor: string,
  ): DecideResult | undefined;
  listComments(id: string): Comment[];
  addComment(id: string, comment: NewComment): Comment | undefined;
}

function summaryOf(detail: ClaimDetail): Claim {
  const claim: Claim & { history?: unknown } = structuredClone(detail);
  delete claim.history;
  return claim;
}

function detailOf(claim: ClaimDetail): ClaimDetail {
  return structuredClone(claim);
}

function submitted(claim: Claim, actor: string): ClaimDetail {
  return {
    ...claim,
    history: [
      {
        at: claim.createdAt,
        actor,
        action: "SUBMITTED",
        fromDecision: null,
        toDecision: claim.decision,
        note: null,
      },
    ],
  };
}

export function createStore(options: StoreOptions = {}): ClaimStore {
  const clock = options.clock ?? systemClock();
  const policies = (options.policies ?? seedPolicies()).map((policy) => ({
    ...policy,
    requiredDocuments: [...policy.requiredDocuments],
  }));
  const claims: ClaimDetail[] = [];
  const comments = new Map<string, Comment[]>();

  function indexOf(id: string): number {
    return claims.findIndex((claim) => claim.id === id);
  }

  for (const seed of options.seeds ?? seedClaims()) {
    let claim = submitted(
      adjudicate(seed, policies, claims, clock, {
        id: seed.id,
        createdAt: seed.createdAt,
      }),
      seed.claimantName,
    );
    for (const { actor, at, ...request } of seed.decisions ?? []) {
      const result = decide(claim, request, actor, at);
      if (!result.ok) {
        throw new Error(`Seed claim ${seed.id} has a decision after a final one.`);
      }
      claim = result.claim;
    }
    claims.push(claim);
    comments.set(claim.id, [...(seed.comments ?? [])]);
  }

  return {
    listPolicies() {
      return [...policies].sort((left, right) =>
        left.policyNumber.localeCompare(right.policyNumber),
      );
    },
    getPolicy(policyNumber) {
      return policies.find((policy) => policy.policyNumber === policyNumber);
    },
    listClaims() {
      return newestFirst(claims).map(summaryOf);
    },
    getClaim(id) {
      const claim = claims.find((item) => item.id === id);
      return claim ? detailOf(claim) : undefined;
    },
    createClaim(draft, actor = draft.claimantName) {
      const claim = submitted(
        adjudicate(draft, policies, claims, clock, {
          id: draft.id ?? randomUUID(),
          createdAt: draft.createdAt ?? new Date().toISOString(),
        }),
        actor,
      );
      claims.push(claim);
      comments.set(claim.id, []);
      return summaryOf(claim);
    },
    decideClaim(id, request, actor) {
      const index = indexOf(id);
      const current = claims[index];
      if (!current) {
        return undefined;
      }
      const result = decide(current, request, actor, new Date().toISOString());
      if (!result.ok) {
        return result;
      }
      claims[index] = result.claim;
      return { ok: true, claim: detailOf(result.claim) };
    },
    listComments(id) {
      return (comments.get(id) ?? []).map((comment) => ({ ...comment }));
    },
    addComment(id, input) {
      const thread = comments.get(id);
      if (!thread) {
        return undefined;
      }
      const comment: Comment = {
        id: randomUUID(),
        at: new Date().toISOString(),
        ...input,
      };
      thread.push(comment);
      return { ...comment };
    },
  };
}
