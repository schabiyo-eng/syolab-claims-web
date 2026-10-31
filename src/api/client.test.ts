import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  hasSession,
  listClaims,
  login,
  logout,
  onUnauthorized,
} from "./client";

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();

function authorizationOf(call: number): string | null {
  const init = fetchMock.mock.calls[call]?.[1];
  return new Headers(init?.headers).get("Authorization");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("sessionStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function signIn(token = "token-1"): Promise<void> {
  fetchMock.mockResolvedValueOnce(
    json(200, {
      token,
      username: "amira.shah",
      role: "CLAIMANT",
      displayName: "Amira Shah",
    }),
  );
  await login("amira.shah", "claimant-demo");
}

describe("login", () => {
  it("posts the credentials, returns the profile, and authorizes later calls", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        token: "token-1",
        username: "amira.shah",
        role: "CLAIMANT",
        displayName: "Amira Shah",
      }),
    );

    const user = await login("amira.shah", "claimant-demo");

    expect(user).toEqual({
      username: "amira.shah",
      role: "CLAIMANT",
      displayName: "Amira Shah",
    });
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "amira.shah",
      password: "claimant-demo",
    });
    expect(authorizationOf(0)).toBeNull();
    expect(hasSession()).toBe(true);

    fetchMock.mockResolvedValueOnce(json(200, []));
    await listClaims();
    expect(authorizationOf(1)).toBe("Bearer token-1");
  });

  it("throws a fixed message on 401 without notifying or keeping a session", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock.mockResolvedValueOnce(json(401, { message: "Server wording." }));

    const failure = login("amira.shah", "wrong").catch((error: unknown) => error);

    const error = await failure;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 401,
      message: "Username or password is incorrect.",
    });
    expect(listener).not.toHaveBeenCalled();
    expect(hasSession()).toBe(false);
    unsubscribe();
  });

  it("does not send or expire a leftover token when signing in again", async () => {
    sessionStorage.setItem("syolab.claims.token", "stale");
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock.mockResolvedValueOnce(json(401, { message: "Server wording." }));

    await login("amira.shah", "wrong").catch(() => undefined);

    expect(authorizationOf(0)).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("authenticated calls", () => {
  it("clear the session and notify once on 401", async () => {
    await signIn();
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    fetchMock.mockResolvedValueOnce(json(401, { message: "Sign in to continue." }));

    const error = await listClaims().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ statusCode: 401 });
    expect(hasSession()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stop notifying after unsubscribe", async () => {
    await signIn();
    const listener = vi.fn();
    onUnauthorized(listener)();
    fetchMock.mockResolvedValueOnce(json(401, { message: "Sign in to continue." }));

    await listClaims().catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("clears the session so the next call has no Authorization header", async () => {
    await signIn();

    logout();

    expect(hasSession()).toBe(false);
    fetchMock.mockResolvedValueOnce(json(200, []));
    await listClaims();
    expect(authorizationOf(1)).toBeNull();
  });
});
