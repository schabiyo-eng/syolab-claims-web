import { randomUUID } from "node:crypto";
import type { CurrentUser, LoginResponse } from "../src/api/types";
import type { Scope } from "./access";

interface DemoUserBase {
  username: string;
  password: string;
  displayName: string;
}

export type DemoUser =
  | (DemoUserBase & { role: "ADJUSTER" })
  | (DemoUserBase & { role: "CLAIMANT"; policyNumbers: readonly string[] });

export interface Principal {
  user: CurrentUser;
  scope: Scope;
}

export const demoUsers: readonly DemoUser[] = [
  {
    username: "amira.shah",
    password: "claimant-demo",
    role: "CLAIMANT",
    displayName: "Amira Shah",
    policyNumbers: ["POL-1001"],
  },
  {
    username: "luis.ortega",
    password: "claimant-demo",
    role: "CLAIMANT",
    displayName: "Luis Ortega",
    policyNumbers: ["POL-1002"],
  },
  {
    username: "dana.wells",
    password: "adjuster-demo",
    role: "ADJUSTER",
    displayName: "Dana Wells",
  },
];

export interface Auth {
  login(username: string, password: string): LoginResponse | null;
  principalFor(header: string | undefined): Principal | null;
}

function scopeOf(user: DemoUser): Scope {
  switch (user.role) {
    case "ADJUSTER":
      return { kind: "all" };
    case "CLAIMANT":
      return { kind: "policies", policyNumbers: new Set(user.policyNumbers) };
  }
}

function principalOf(user: DemoUser): Principal {
  return {
    user: { username: user.username, role: user.role, displayName: user.displayName },
    scope: scopeOf(user),
  };
}

export function createAuth(users: readonly DemoUser[] = demoUsers): Auth {
  const sessions = new Map<string, Principal>();

  return {
    login(username, password) {
      const user = users.find(
        (candidate) =>
          candidate.username === username && candidate.password === password,
      );
      if (!user) {
        return null;
      }
      const token = randomUUID();
      const principal = principalOf(user);
      sessions.set(token, principal);
      return { token, ...principal.user };
    },
    principalFor(header) {
      const match = /^bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
      if (!match?.[1]) {
        return null;
      }
      return sessions.get(match[1]) ?? null;
    },
  };
}
