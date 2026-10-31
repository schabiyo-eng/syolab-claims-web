import { randomUUID } from "node:crypto";
import type { Claim, Comment, Policy } from "../src/api/types";
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
  getClaim(id: string): Claim | undefined;
  createClaim(draft: NewClaim): Claim;
  decideClaim(
    id: string,
    request: DecisionInput,
    actor: string,
  ): DecideResult | undefined;
  listComments(id: string): Comment[];
  addComment(id: string, comment: NewComment): Comment | undefined;
}

function copyOf(claim: Claim): Claim {
  return structuredClone(claim);
}

export function createStore(options: StoreOptions = {}): ClaimStore {
  const clock = options.clock ?? systemClock();
  const policies = (options.policies ?? seedPolicies()).map((policy) => ({
    ...policy,
    requiredDocuments: [...policy.requiredDocuments],
  }));
  const claims: Claim[] = [];
  const comments = new Map<string, Comment[]>();

  function indexOf(id: string): number {
    return claims.findIndex((claim) => claim.id === id);
  }

  for (const seed of options.seeds ?? seedClaims()) {
    const claim = adjudicate(seed, policies, claims, clock, {
      id: seed.id,
      createdAt: seed.createdAt,
    });
    claims.push(claim);
    comments.set(claim.id, []);
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
      return newestFirst(claims).map(copyOf);
    },
    getClaim(id) {
      const claim = claims.find((item) => item.id === id);
      return claim ? copyOf(claim) : undefined;
    },
    createClaim(draft) {
      const claim = adjudicate(draft, policies, claims, clock, {
        id: draft.id ?? randomUUID(),
        createdAt: draft.createdAt ?? new Date().toISOString(),
      });
      claims.push(claim);
      comments.set(claim.id, []);
      return copyOf(claim);
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
      return { ok: true, claim: copyOf(result.claim) };
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
