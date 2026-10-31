import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";

describe("createAuth", () => {
  it("returns a token and the profile for good credentials", () => {
    const auth = createAuth();
    const session = auth.login("amira.shah", "claimant-demo");
    expect(session).not.toBeNull();
    expect(session?.token).toMatch(/\S/);
    expect(session).toMatchObject({
      username: "amira.shah",
      role: "CLAIMANT",
      displayName: "Amira Shah",
    });
  });

  it("returns only the login wire shape", () => {
    const auth = createAuth();
    const session = auth.login("luis.ortega", "claimant-demo");
    expect(Object.keys(session ?? {}).sort()).toEqual([
      "displayName",
      "role",
      "token",
      "username",
    ]);
  });

  it("rejects a wrong password and an unknown user", () => {
    const auth = createAuth();
    expect(auth.login("amira.shah", "adjuster-demo")).toBeNull();
    expect(auth.login("nobody", "claimant-demo")).toBeNull();
  });

  it("authorizes a bearer token from login", () => {
    const auth = createAuth();
    const session = auth.login("dana.wells", "adjuster-demo");
    expect(auth.principalFor(`Bearer ${session?.token}`)?.user).toEqual({
      username: "dana.wells",
      role: "ADJUSTER",
      displayName: "Dana Wells",
    });
    expect(auth.principalFor(`bearer ${session?.token}`)?.user.username).toBe(
      "dana.wells",
    );
  });

  it("does not authorize a missing header, another scheme, or an unknown token", () => {
    const auth = createAuth();
    const session = auth.login("amira.shah", "claimant-demo");
    expect(auth.principalFor(undefined)).toBeNull();
    expect(auth.principalFor("")).toBeNull();
    expect(auth.principalFor(`Basic ${session?.token}`)).toBeNull();
    expect(auth.principalFor("Bearer unknown-token")).toBeNull();
  });

  it("keeps tokens from two logins valid", () => {
    const auth = createAuth();
    const first = auth.login("amira.shah", "claimant-demo");
    const second = auth.login("amira.shah", "claimant-demo");
    expect(first?.token).not.toBe(second?.token);
    expect(auth.principalFor(`Bearer ${first?.token}`)).not.toBeNull();
    expect(auth.principalFor(`Bearer ${second?.token}`)).not.toBeNull();
  });

  it("scopes a claimant to exactly their own policies", () => {
    const auth = createAuth();
    const amira = auth.login("amira.shah", "claimant-demo");
    const luis = auth.login("luis.ortega", "claimant-demo");
    const amiraScope = auth.principalFor(`Bearer ${amira?.token}`)?.scope;
    const luisPrincipal = auth.principalFor(`Bearer ${luis?.token}`);

    expect(amiraScope?.kind).toBe("policies");
    expect(amiraScope?.kind === "policies" && [...amiraScope.policyNumbers]).toEqual([
      "POL-1001",
    ]);
    expect(luisPrincipal?.user).toEqual({
      username: "luis.ortega",
      role: "CLAIMANT",
      displayName: "Luis Ortega",
    });
    expect(
      luisPrincipal?.scope.kind === "policies" && [
        ...luisPrincipal.scope.policyNumbers,
      ],
    ).toEqual(["POL-1002"]);
  });

  it("gives an adjuster an all scope", () => {
    const auth = createAuth();
    const session = auth.login("dana.wells", "adjuster-demo");
    expect(auth.principalFor(`Bearer ${session?.token}`)?.scope).toEqual({
      kind: "all",
    });
  });
});
