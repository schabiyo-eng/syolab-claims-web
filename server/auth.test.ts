import { describe, expect, it } from "vitest";
import { createAuth, demoUsers } from "./auth";

function scopedPolicies(auth: ReturnType<typeof createAuth>, token?: string) {
  const scope = auth.principalFor(`Bearer ${token}`)?.scope;
  return scope?.kind === "policies" ? [...scope.policyNumbers] : scope;
}

describe("createAuth", () => {
  it("lists the same demo users as the API", () => {
    expect(
      demoUsers.map(({ username, role, displayName }) => [username, role, displayName]),
    ).toEqual([
      ["amira", "CLAIMANT", "Amira Shah"],
      ["luis", "CLAIMANT", "Luis Ortega"],
      ["dana", "ADJUSTER", "Dana Whitfield"],
    ]);
  });

  it("returns a token and the profile for good credentials", () => {
    const auth = createAuth();
    const session = auth.login("amira", "amira-demo");
    expect(session).not.toBeNull();
    expect(session?.token).toMatch(/\S/);
    expect(session).toMatchObject({
      username: "amira",
      role: "CLAIMANT",
      displayName: "Amira Shah",
    });
  });

  it("returns only the login wire shape", () => {
    const auth = createAuth();
    const session = auth.login("luis", "luis-demo");
    expect(Object.keys(session ?? {}).sort()).toEqual([
      "displayName",
      "role",
      "token",
      "username",
    ]);
  });

  it("rejects a wrong password and an unknown user", () => {
    const auth = createAuth();
    expect(auth.login("amira", "dana-demo")).toBeNull();
    expect(auth.login("amira.shah", "amira-demo")).toBeNull();
    expect(auth.login("nobody", "amira-demo")).toBeNull();
  });

  it("authorizes a bearer token from login", () => {
    const auth = createAuth();
    const session = auth.login("dana", "dana-demo");
    expect(auth.principalFor(`Bearer ${session?.token}`)?.user).toEqual({
      username: "dana",
      role: "ADJUSTER",
      displayName: "Dana Whitfield",
    });
    expect(auth.principalFor(`bearer ${session?.token}`)?.user.username).toBe("dana");
  });

  it("does not authorize a missing header, another scheme, or an unknown token", () => {
    const auth = createAuth();
    const session = auth.login("amira", "amira-demo");
    expect(auth.principalFor(undefined)).toBeNull();
    expect(auth.principalFor("")).toBeNull();
    expect(auth.principalFor(`Basic ${session?.token}`)).toBeNull();
    expect(auth.principalFor("Bearer unknown-token")).toBeNull();
  });

  it("keeps tokens from two logins valid", () => {
    const auth = createAuth();
    const first = auth.login("amira", "amira-demo");
    const second = auth.login("amira", "amira-demo");
    expect(first?.token).not.toBe(second?.token);
    expect(auth.principalFor(`Bearer ${first?.token}`)).not.toBeNull();
    expect(auth.principalFor(`Bearer ${second?.token}`)).not.toBeNull();
  });

  it("scopes a claimant to exactly the policies they hold", () => {
    const auth = createAuth();
    const amira = auth.login("amira", "amira-demo");
    const luis = auth.login("luis", "luis-demo");

    expect(scopedPolicies(auth, amira?.token)).toEqual(["POL-1001"]);
    expect(auth.principalFor(`Bearer ${luis?.token}`)?.user).toEqual({
      username: "luis",
      role: "CLAIMANT",
      displayName: "Luis Ortega",
    });
    expect(scopedPolicies(auth, luis?.token)).toEqual(["POL-1002"]);
  });

  it("gives an adjuster an all scope", () => {
    const auth = createAuth();
    const session = auth.login("dana", "dana-demo");
    expect(auth.principalFor(`Bearer ${session?.token}`)?.scope).toEqual({
      kind: "all",
    });
  });
});
