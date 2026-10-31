import type {
  Claim,
  ClaimDetail,
  Comment,
  CommentRequest,
  CreateClaimRequest,
  CurrentUser,
  DecisionRequest,
  ErrorMessage,
  LoginRequest,
  LoginResponse,
  Policy,
} from "./types";

const TOKEN_KEY = "syolab.claims.token";

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

function sessionStore(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    // Storage access can throw when the browser blocks it.
    return null;
  }
}

function readToken(): string | null {
  return sessionStore()?.getItem(TOKEN_KEY) ?? null;
}

function storeToken(token: string): void {
  sessionStore()?.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  sessionStore()?.removeItem(TOKEN_KEY);
}

export function hasSession(): boolean {
  return readToken() !== null;
}

export function logout(): void {
  clearToken();
}

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ErrorMessage>;
    if (typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  } catch {
    // The body was not the error schema.
  }
  if (response.status >= 500) {
    return "The claims service is unavailable.";
  }
  return `Request failed (${response.status}).`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken();
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "The claims service is unavailable.");
  }
  if (response.status === 401 && token !== null) {
    clearToken();
    for (const listener of [...unauthorizedListeners]) {
      listener();
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  // A new sign-in replaces any old token, so a rejected login is never read as an expired session.
  clearToken();
  const body: LoginRequest = { username, password };
  let session: LoginResponse;
  try {
    session = await request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    if (error instanceof ApiError && error.statusCode === 401) {
      throw new ApiError(401, "Username or password is incorrect.");
    }
    throw error;
  }
  storeToken(session.token);
  return {
    username: session.username,
    role: session.role,
    displayName: session.displayName,
  };
}

export function currentUser(): Promise<CurrentUser> {
  return request<CurrentUser>("/api/auth/me");
}

export function listPolicies(): Promise<Policy[]> {
  return request<Policy[]>("/api/policies");
}

export function listClaims(): Promise<Claim[]> {
  return request<Claim[]>("/api/claims");
}

export function createClaim(body: CreateClaimRequest): Promise<Claim> {
  return request<Claim>("/api/claims", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function claimPath(id: string): string {
  return `/api/claims/${encodeURIComponent(id)}`;
}

export function getClaim(id: string): Promise<ClaimDetail> {
  return request<ClaimDetail>(claimPath(id));
}

export function decideClaim(id: string, body: DecisionRequest): Promise<ClaimDetail> {
  return request<ClaimDetail>(`${claimPath(id)}/decision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listComments(id: string): Promise<Comment[]> {
  return request<Comment[]>(`${claimPath(id)}/comments`);
}

export function postComment(id: string, text: string): Promise<Comment> {
  const body: CommentRequest = { body: text };
  return request<Comment>(`${claimPath(id)}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
