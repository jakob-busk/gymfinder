# Issue tracker configuration

Config consumed by the `bcj-to-spec`, `bcj-to-issues`, `bcj-implement-spec` and
`bcj-qa-task` skills. When those skills say "the issue tracker and triage label vocabulary
should have been provided to you," **this file is that config** — do not run
`setup-matt-pocock-skills`.

## Issue tracker

- **Type:** GitHub Issues
- **Repo:** `jakob-busk/gymfinder`
- **CLI:** `gh` (e.g. `gh issue create`, `gh issue list`)
- **PRs as a request surface:** no

## Triage labels

| Role | Label |
|------|-------|
| A parent spec issue whose sub-issues are still being built | `spec` |
| Fully specified, AFK-ready — an implementer subagent may pick it up | `ready-for-agent` |
| An implementer subagent is working it right now | `agent-wip` |
| Every sub-issue of a parent task closed — awaiting human QA | `needs-qa` |
| An agent gave up — a human must finish it | `needs-human` |
| Maintainer needs to evaluate | `needs-triage` |
| Waiting on reporter | `needs-info` |
| Will not be actioned | `wontfix` |

Who applies what:

- `/bcj-to-spec` puts `spec` on the **parent spec issue**, and never `ready-for-agent` — the
  parent carries the spec, so it must stay out of the pool of implementable tasks.
- `/bcj-to-issues` puts `ready-for-agent` on every **sub-issue**, plus an assignee.
- `/bcj-implement-spec` drives each **sub-issue** through `ready-for-agent → agent-wip →`
  **closed**, or `needs-human` (left open) for one it handed over.
- When done, `/bcj-implement-spec` labels the **parent**: `needs-qa` once every sub-issue is
  closed, or `needs-human` if any sub-issue is still open on `needs-human`.
- `/bcj-qa-task` files its follow-up findings as one issue labelled `needs-triage`.
