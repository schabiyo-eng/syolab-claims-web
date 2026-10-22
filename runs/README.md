# Run log

Each factory role appends one JSON object per line to `runs/log.jsonl` when it finishes. The stop hook appends a line with `"kind": "tests"`.

`runs/*.jsonl` and `runs/hook-state.json` are gitignored. Do not commit a run.

```json
{
  "ts": "ISO-8601",
  "ticket": null,
  "kind": "plan|implement|review|reflect|tests",
  "model": "model-id-or-null",
  "retries": 0,
  "failures": [],
  "reviewerFlags": [],
  "escalations": [],
  "notes": ""
}
```

| Field           | Meaning                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| `ts`            | ISO-8601 time the line was written                                             |
| `ticket`        | Ticket path, or `null` when the run has none                                   |
| `kind`          | `plan`, `implement`, `review`, `reflect`, or `tests` for the stop hook         |
| `model`         | Model id used for that role, or `null` for the hook                            |
| `retries`       | Implementer retries so far. The hook stores consecutive suite failures         |
| `failures`      | Failing test names, or the command when names could not be parsed              |
| `reviewerFlags` | Reviewer flags. Empty for other roles                                          |
| `escalations`   | Models or roles escalated after two failed retries                             |
| `notes`         | Short note. Reviewer notes name the command and the result, not a diff summary |

`runs/hook-state.json` stores `{ "consecutiveFailures": 0 }`. The stop hook clears it after a passing suite. At 2, the follow-up tells the agent to escalate the implementer.
