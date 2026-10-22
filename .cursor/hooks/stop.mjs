#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const runsDir = resolve(root, "runs");
const statePath = resolve(runsDir, "hook-state.json");
const logPath = resolve(runsDir, "log.jsonl");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function readFailures() {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8"));
    return typeof parsed.consecutiveFailures === "number" &&
      parsed.consecutiveFailures > 0
      ? parsed.consecutiveFailures
      : 0;
  } catch {
    return 0;
  }
}

function writeFailures(consecutiveFailures) {
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify({ consecutiveFailures }, null, 2)}\n`);
}

function appendLog(entry) {
  mkdirSync(runsDir, { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
}

function respond(followup) {
  if (followup) {
    process.stdout.write(JSON.stringify({ followup_message: followup }));
    return;
  }
  process.stdout.write("{}");
}

function stripAnsi(value) {
  const escape = String.fromCharCode(27);
  return value.replace(new RegExp(`${escape}\\[[0-9;]*m`, "g"), "");
}

function failureNames(log) {
  const names = [];
  const seen = new Set();
  for (const line of stripAnsi(log).split("\n")) {
    const vitest = line.match(/^\s*(?:×|✗|FAIL)\s+(.+?)\s*$/);
    const playwright = line.match(/^\s*\d+\)\s+\[.+?\]\s+›\s+(.+?)\s*$/);
    const picked = (vitest?.[1] ?? playwright?.[1] ?? "")
      .replace(/\s+\d+ms$/, "")
      .trim();
    if (picked && !seen.has(picked)) {
      seen.add(picked);
      names.push(picked);
    }
  }
  return names;
}

const raw = await readStdin();
let status = "completed";
try {
  const payload = JSON.parse(raw);
  if (payload && typeof payload.status === "string") {
    status = payload.status;
  }
} catch {
  status = "completed";
}

if (status === "aborted" || status === "error") {
  appendLog({
    ts: new Date().toISOString(),
    ticket: null,
    kind: "tests",
    model: null,
    retries: readFailures(),
    failures: [],
    reviewerFlags: [],
    escalations: [],
    notes: `stop status ${status}; suite not run`,
  });
  respond("");
  process.exit(0);
}

const steps = [
  ["npm", ["test"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "e2e"]],
];

let combined = "";
let failedCommand = "";
for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 540_000,
  });
  combined += `\n$ ${command} ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    failedCommand = `${command} ${args.join(" ")}`;
    break;
  }
}

const now = new Date().toISOString();
if (!failedCommand) {
  writeFailures(0);
  appendLog({
    ts: now,
    ticket: null,
    kind: "tests",
    model: null,
    retries: 0,
    failures: [],
    reviewerFlags: [],
    escalations: [],
    notes: "npm test, npm run build, and npm run e2e passed",
  });
  respond("");
  process.exit(0);
}

const consecutive = readFailures() + 1;
writeFailures(consecutive);
const names = failureNames(combined);
if (names.length === 0) {
  names.push(failedCommand);
}
const tail = combined.trim().split("\n").slice(-40).join("\n");
const escalate = consecutive >= 2;
appendLog({
  ts: now,
  ticket: null,
  kind: "tests",
  model: null,
  retries: consecutive,
  failures: names,
  reviewerFlags: [],
  escalations: escalate ? ["implementer"] : [],
  notes: `failed: ${failedCommand}`,
});

const lines = [
  "The test suite failed. Fix the product code. Do not weaken existing tests.",
  "",
  "Failing tests:",
  ...names.map((name) => `- ${name}`),
  "",
  "Log tail:",
  tail,
];
if (escalate) {
  lines.push(
    "",
    "Consecutive failures reached 2. Escalate the implementer to a stronger model than the fast default, per the model-routing skill.",
  );
}
respond(lines.join("\n"));
process.exit(0);
