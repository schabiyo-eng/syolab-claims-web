---
name: model-routing
description: Route claims-intake work across planner, implementer, reviewer, and reflection. Use when starting a change, retrying a failed run, or recording a factory run.
---

# Model routing

pstack supplies the playbooks. This skill only decides who runs, which model is pinned, and what gets logged.

Plugin: https://github.com/cursor/plugins/tree/main/pstack
Guide: https://github.com/cursor/plugins/blob/main/pstack/docs/guide/README.md

1. Plan with the planner (`.cursor/agents/planner.md`). It runs pstack `/architect` and stops at the checkpoint before implementation, then runs `/interrogate`. The planner does not write product code. Model: `grok-4.7[effort=high]`.
2. Execute with the implementer (`.cursor/agents/implementer.md`). It follows pstack `/tdd`. When it edits TypeScript, it also follows pstack `/typescript-best-practices`. Model: `composer-2.5[fast=false]`.
3. Always finish with the reviewer (`.cursor/agents/reviewer.md`) in a fresh context. Evidence only: test commands, their output, and before/after proof. Never a diff-only review. If the reviewer session cannot execute commands, the review is inconclusive until those commands are re-run and their output is recorded; do not treat a shell-blocked review as a pass. Model: `grok-4.7[effort=high]`.
4. On a test failure, retry the implementer. After two failed retries, escalate the implementer to `grok-4.7[effort=high]`, a stronger model than the fast default. Do not weaken existing tests.
5. Append one JSONL line to `runs/log.jsonl` when each role finishes. Include ticket, retries, failures, reviewer flags, escalations, and the model used. Schema: `runs/README.md`.
6. After the run, reflection (`.cursor/agents/reflection.md`) fixes the guardrail, not the pull request. The lesson lands as a rule, a hook, or a CI check in a separate pull request a human reviews. Do not merge it. Model: `grok-4.7[effort=high]`.

The stop hook writes `kind` `tests`. Reviewer notes name the evidence (command and result), not a diff summary.
