import { randomUUID } from "node:crypto";
import type { CurrentUser, LoginResponse } from "../src/api/types";

export interface DemoUser extends CurrentUser {
  password: string;
}

export const demoUsers: readonly DemoUser[] = [
  {
    username: "amira.shah",
    password: "claimant-demo",
    role: "CLAIMANT",
    displayName: "Amira Shah",
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
  userForAuthorization(header: string | undefined): CurrentUser | null;
}

function profileOf(user: DemoUser): CurrentUser {
  return { username: user.username, role: user.role, displayName: user.displayName };
}

export function createAuth(users: readonly DemoUser[] = demoUsers): Auth {
  const sessions = new Map<string, CurrentUser>();

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
      const profile = profileOf(user);
      sessions.set(token, profile);
      return { token, ...profile };
    },
    userForAuthorization(header) {
      const match = /^bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
      if (!match?.[1]) {
        return null;
      }
      return sessions.get(match[1]) ?? null;
    },
  };
}
