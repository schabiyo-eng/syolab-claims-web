import { randomUUID } from "node:crypto";
import type { Claim, Policy } from "../src/api/types";
import { newestFirst } from "../src/domain/claims";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { adjudicate, type NewClaim } from "./evaluate";
import { seedClaims, seedPolicies, type SeedClaim } from "./seed";

export interface StoreOptions {
  clock?: Clock;
  policies?: Policy[];
  seeds?: SeedClaim[];
}

export interface ClaimStore {
  listPolicies(): Policy[];
  getPolicy(policyNumber: string): Policy | undefined;
  listClaims(): Claim[];
  getClaim(id: string): Claim | undefined;
  createClaim(draft: NewClaim): Claim;
}

export function createStore(options: StoreOptions = {}): ClaimStore {
  const clock = options.clock ?? systemClock();
  const policies = (options.policies ?? seedPolicies()).map((policy) => ({
    ...policy,
    requiredDocuments: [...policy.requiredDocuments],
  }));
  const claims: Claim[] = [];
  for (const seed of options.seeds ?? seedClaims()) {
    claims.push(
      adjudicate(seed, policies, claims, clock, {
        id: seed.id,
        createdAt: seed.createdAt,
      }),
    );
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
      return newestFirst(claims);
    },
    getClaim(id) {
      return claims.find((claim) => claim.id === id);
    },
    createClaim(draft) {
      const claim = adjudicate(draft, policies, claims, clock, {
        id: draft.id ?? randomUUID(),
        createdAt: draft.createdAt ?? new Date().toISOString(),
      });
      claims.push(claim);
      return claim;
    },
  };
}
