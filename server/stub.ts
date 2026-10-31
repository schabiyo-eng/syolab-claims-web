import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { canSee } from "./access";
import { createAuth } from "./auth";
import { systemClock } from "./clock";
import { parseCommentRequest, parseCreateClaim, parseDecisionRequest } from "./request";
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

async function readJson(
  request: IncomingMessage,
): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  try {
    return { ok: true, value: JSON.parse(await readBody(request)) as unknown };
  } catch {
    return { ok: false, message: "Request body must be JSON." };
  }
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
    const principal = auth.principalFor(request.headers.authorization);
    if (!principal) {
      if (path.startsWith("/api/")) {
        sendJson(response, 401, { message: "Sign in to continue." });
      } else {
        sendJson(response, 404, { message: "Not found" });
      }
      return;
    }
    const { scope } = principal;
    if (method === "GET" && path === "/api/auth/me") {
      sendJson(response, 200, principal.user);
      return;
    }
    if (method === "GET" && path === "/api/policies") {
      sendJson(
        response,
        200,
        store.listPolicies().filter((policy) => canSee(scope, policy.policyNumber)),
      );
      return;
    }
    const policyMatch = /^\/api\/policies\/([^/]+)$/.exec(path);
    if (method === "GET" && policyMatch?.[1]) {
      const policy = store.getPolicy(decodeURIComponent(policyMatch[1]));
      if (!policy || !canSee(scope, policy.policyNumber)) {
        sendJson(response, 404, { message: "Policy not found" });
        return;
      }
      sendJson(response, 200, policy);
      return;
    }
    if (method === "GET" && path === "/api/claims") {
      sendJson(
        response,
        200,
        store.listClaims().filter((claim) => canSee(scope, claim.policyNumber)),
      );
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
      if (!canSee(scope, claim.claim.policyNumber)) {
        sendJson(response, 404, { message: "Policy not found" });
        return;
      }
      sendJson(
        response,
        201,
        store.createClaim(claim.claim, principal.user.displayName),
      );
      return;
    }
    const claimMatch = /^\/api\/claims\/([^/]+)$/.exec(path);
    if (method === "GET" && claimMatch?.[1]) {
      const claim = store.getClaim(decodeURIComponent(claimMatch[1]));
      if (!claim || !canSee(scope, claim.policyNumber)) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      sendJson(response, 200, claim);
      return;
    }
    const decisionMatch = /^\/api\/claims\/([^/]+)\/decision$/.exec(path);
    if (method === "POST" && decisionMatch?.[1]) {
      if (principal.user.role !== "ADJUSTER") {
        sendJson(response, 403, { message: "Only adjusters can decide claims." });
        return;
      }
      const id = decodeURIComponent(decisionMatch[1]);
      if (!store.getClaim(id)) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      const body = await readJson(request);
      if (!body.ok) {
        sendJson(response, 400, { message: body.message });
        return;
      }
      const decision = parseDecisionRequest(body.value);
      if (!decision.ok) {
        sendJson(response, 400, { message: decision.message });
        return;
      }
      const result = store.decideClaim(
        id,
        decision.request,
        principal.user.displayName,
      );
      if (!result) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      if (!result.ok) {
        sendJson(response, 409, {
          message: "This claim already has a final decision.",
        });
        return;
      }
      sendJson(response, 200, result.claim);
      return;
    }
    const commentsMatch = /^\/api\/claims\/([^/]+)\/comments$/.exec(path);
    if ((method === "GET" || method === "POST") && commentsMatch?.[1]) {
      const id = decodeURIComponent(commentsMatch[1]);
      const claim = store.getClaim(id);
      if (!claim || !canSee(scope, claim.policyNumber)) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      if (method === "GET") {
        sendJson(response, 200, store.listComments(id));
        return;
      }
      const body = await readJson(request);
      if (!body.ok) {
        sendJson(response, 400, { message: body.message });
        return;
      }
      const comment = parseCommentRequest(body.value);
      if (!comment.ok) {
        sendJson(response, 400, { message: comment.message });
        return;
      }
      const stored = store.addComment(id, {
        author: principal.user.displayName,
        role: principal.user.role,
        body: comment.body,
      });
      if (!stored) {
        sendJson(response, 404, { message: "Claim not found" });
        return;
      }
      sendJson(response, 201, stored);
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
