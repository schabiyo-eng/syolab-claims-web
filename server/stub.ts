import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAuth } from "./auth";
import { systemClock } from "./clock";
import { parseCreateClaim } from "./request";
import { createStore } from "./store";

const HOST = "127.0.0.1";
const PORT = Number(process.env.STUB_PORT ?? 8080);
const store = createStore({ clock: systemClock() });
const auth = createAuth();

function applyCors(request: IncomingMessage, response: ServerResponse): void {
  const origin = request.headers.origin;
  if (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173") {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  applyCors(request, response);
  const method = request.method ?? "GET";
  if (method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${HOST}`);
  const path = url.pathname;

  try {
    if (method === "POST" && path === "/api/auth/login") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readBody(request)) as unknown;
      } catch {
        sendJson(response, 400, { message: "Request body must be JSON." });
        return;
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        sendJson(response, 400, { message: "Request body must be a JSON object." });
        return;
      }
      const { username, password } = parsed as Record<string, unknown>;
      if (typeof username !== "string" || typeof password !== "string") {
        sendJson(response, 400, { message: "Username and password are required." });
        return;
      }
      const session = auth.login(username, password);
      if (!session) {
        sendJson(response, 401, { message: "Invalid username or password." });
        return;
      }
      sendJson(response, 200, session);
      return;
    }
    const user = auth.userForAuthorization(request.headers.authorization);
    if (path.startsWith("/api/") && !user) {
      sendJson(response, 401, { message: "Sign in to continue." });
      return;
    }
    if (method === "GET" && path === "/api/auth/me") {
      sendJson(response, 200, user);
      return;
    }
    if (method === "GET" && path === "/api/policies") {
      sendJson(response, 200, store.listPolicies());
      return;
    }
    const policyMatch = /^\/api\/policies\/([^/]+)$/.exec(path);
    if (method === "GET" && policyMatch?.[1]) {
      const policy = store.getPolicy(decodeURIComponent(policyMatch[1]));
      if (!policy) {
        sendJson(response, 404, { message: "Policy not found" });
        return;
      }
      sendJson(response, 200, policy);
      return;
    }
    if (method === "GET" && path === "/api/claims") {
      sendJson(response, 200, store.listClaims());
      return;
    }
    if (method === "POST" && path === "/api/claims") {
      const raw = await readBody(request);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        sendJson(response, 400, { message: "Request body must be JSON." });
        return;
      }
      const claim = parseCreateClaim(parsed);
      if (!claim.ok) {
        sendJson(response, 400, { message: claim.message });
        return;
      }
      sendJson(response, 201, store.createClaim(claim.claim));
      return;
    }
    const claimMatch = /^\/api\/claims\/([^/]+)$/.exec(path);
    if (method === "GET" && claimMatch?.[1]) {
      const claim = store.getClaim(decodeURIComponent(claimMatch[1]));
      if (!claim) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      sendJson(response, 200, claim);
      return;
    }
    sendJson(response, 404, { message: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed.";
    sendJson(response, 400, { message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Claims stub listening on http://${HOST}:${PORT}`);
});
