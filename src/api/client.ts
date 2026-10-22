import type { Claim, CreateClaimRequest, ErrorMessage, Policy } from "./types";

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
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
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "The claims service is unavailable.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  return (await response.json()) as T;
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
