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

  it("rejects a wrong password and an unknown user", () => {
    const auth = createAuth();
    expect(auth.login("amira.shah", "adjuster-demo")).toBeNull();
    expect(auth.login("nobody", "claimant-demo")).toBeNull();
  });

  it("authorizes a bearer token from login", () => {
    const auth = createAuth();
    const session = auth.login("dana.wells", "adjuster-demo");
    expect(auth.userForAuthorization(`Bearer ${session?.token}`)).toEqual({
      username: "dana.wells",
      role: "ADJUSTER",
      displayName: "Dana Wells",
    });
    expect(auth.userForAuthorization(`bearer ${session?.token}`)?.username).toBe(
      "dana.wells",
    );
  });

  it("does not authorize a missing header, another scheme, or an unknown token", () => {
    const auth = createAuth();
    const session = auth.login("amira.shah", "claimant-demo");
    expect(auth.userForAuthorization(undefined)).toBeNull();
    expect(auth.userForAuthorization("")).toBeNull();
    expect(auth.userForAuthorization(`Basic ${session?.token}`)).toBeNull();
    expect(auth.userForAuthorization("Bearer unknown-token")).toBeNull();
  });

  it("keeps tokens from two logins valid", () => {
    const auth = createAuth();
    const first = auth.login("amira.shah", "claimant-demo");
    const second = auth.login("amira.shah", "claimant-demo");
    expect(first?.token).not.toBe(second?.token);
    expect(auth.userForAuthorization(`Bearer ${first?.token}`)).not.toBeNull();
    expect(auth.userForAuthorization(`Bearer ${second?.token}`)).not.toBeNull();
  });
});
