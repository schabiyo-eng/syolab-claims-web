# Syolab claims intake

A single-page claims desk for the fictional Syolab insurance demo. It loads policies, submits a claim, and lists the validation status returned by the claims API.

The API contract is `openapi/claims-api.yaml`. TypeScript types are generated from that file. The dev server proxies `/api` to `http://localhost:8080`.

Presenter notes are in [DEMO.md](DEMO.md).

## Install

```bash
npm install
```

Install Chromium once before the browser smoke:

```bash
npx playwright install chromium
```

## Dev

Start the API on port 8080, then:

```bash
npm run dev
```

Open `http://localhost:5173`.

This repository also includes a local stub that implements the same contract and seed, for the browser smoke and for UI work without the API process:

```bash
npm run stub
```

The stub listens on `http://127.0.0.1:8080`. In another terminal, run `npm run dev`.

Sign in with one of the stub's demo logins:

| Username     | Password        | Role     | Display name |
| ------------ | --------------- | -------- | ------------ |
| `amira.shah` | `claimant-demo` | Claimant | Amira Shah   |
| `dana.wells` | `adjuster-demo` | Adjuster | Dana Wells   |

`POST /api/auth/login` returns a token. Every other `/api` call needs it in an `Authorization: Bearer <token>` header and gets a 401 without it. The app keeps the token in session storage, so it lasts until the tab closes or you log out. The stub keeps tokens in memory, so restarting it signs everyone out.

## Unit tests

```bash
npm test
```

Form validation, status labels, and the API client's token handling are covered here. The stub's claim rules and logins are covered too, so the seed statuses stay aligned with the contract.

## Regenerate API types

```bash
npm run generate:api
```

Commit the generated `src/api/schema.d.ts`. `npm run check:api` regenerates it and fails if the file would change.

## Browser smoke

`npm run e2e` starts the stub and the Vite dev server, then runs the Playwright smoke in Chromium. The smoke signs in as `amira.shah`, sees Amira Shah, and submits a `100.00` claim on `POL-1002`.

## Browser smoke against the Spring API

Start the API on port 8080 first (`./mvnw spring-boot:run` in the API repository). Then:

```bash
npm run e2e:live
```

That runs the same smoke through the Vite proxy against the already running API. It does not start the stub. The smoke submits a claim, so the API's in-memory data changes until that process restarts.

## Production build

```bash
npm run build
```

## Software factory

This repo sits on the [pstack](https://github.com/cursor/plugins/tree/main/pstack) plugin. pstack supplies the playbooks. This repo adds model routing, a run log, and the hooks and CI that act as guardrails.

Install pstack in Cursor:

```text
/add-plugin pstack
/setup-pstack
```

Guide: https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md

What this repo adds:

| Piece       | Where                                | Role                                                                                       |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Routing     | `.cursor/skills/model-routing`       | Which role runs, and when to escalate                                                      |
| Planner     | `.cursor/agents/planner.md`          | pstack `/architect`, then `/interrogate`. No product code                                  |
| Implementer | `.cursor/agents/implementer.md`      | pstack `/tdd`. Also `/typescript-best-practices` when editing TypeScript                   |
| Reviewer    | `.cursor/agents/reviewer.md`         | Evidence only. Tests and before/after proof. Does not review by reading the diff           |
| Reflection  | `.cursor/agents/reflection.md`       | Fix the guardrail, not the pull request                                                    |
| Edit hook   | `.cursor/hooks.json` `afterFileEdit` | Format, lint, and an incremental type check on the edited file                             |
| Stop hook   | `.cursor/hooks.json` `stop`          | `npm test`, `npm run build`, and `npm run e2e`. On failure, send a follow-up. Loop limit 3 |
| Run log     | `runs/`                              | Ticket, retries, failures, reviewer flags, escalations, model per role                     |
| CI          | `.github/workflows/ci.yml`           | Generated-type check plus the same suite, on every pull request                            |

The stop hook's `loop_limit` is 3. A passing suite clears `runs/hook-state.json` and does not send a follow-up. A failure appends to `runs/log.jsonl` and sends the failing test names. At two consecutive failures the follow-up also says to escalate the implementer. `runs/*.jsonl` and `runs/hook-state.json` are gitignored.

Subagent model pin: the frontmatter field is `model`, confirmed from https://cursor.com/docs/subagents. Hook behavior was confirmed from https://cursor.com/docs/hooks: `afterFileEdit` reads `file_path` and `edits` on stdin, `stop` sends a follow-up by printing `followup_message`, and the loop cap is `loop_limit`.

The pinned models are in `.cursor/agents/`. Planner, reviewer, and reflection use `grok-4.7[effort=high]`. The implementer uses `composer-2.5[fast=false]`.

See [DEMO.md](DEMO.md) for the live walkthrough.
