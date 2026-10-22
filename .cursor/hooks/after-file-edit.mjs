#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function run(command, args) {
  spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 90_000,
  });
}

const raw = await readStdin();
let filePath = "";
try {
  const payload = JSON.parse(raw);
  if (payload && typeof payload.file_path === "string") {
    filePath = payload.file_path;
  }
} catch {
  process.exit(0);
}

if (!filePath || !existsSync(filePath)) {
  process.exit(0);
}

const bin = (name) => resolve(root, "node_modules", ".bin", name);
if (!existsSync(resolve(root, "node_modules"))) {
  process.exit(0);
}

const extension = extname(filePath).toLowerCase();
const formattable = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".yml",
  ".yaml",
  ".html",
]);

if (formattable.has(extension) && existsSync(bin("prettier"))) {
  run(bin("prettier"), ["--write", "--ignore-unknown", filePath]);
}

if ((extension === ".ts" || extension === ".tsx") && existsSync(bin("eslint"))) {
  run(bin("eslint"), ["--fix", "--no-error-on-unmatched-pattern", filePath]);
}

if ((extension === ".ts" || extension === ".tsx") && existsSync(bin("tsc"))) {
  run(bin("tsc"), ["--noEmit", "--pretty", "false", "--incremental"]);
}

process.exit(0);
