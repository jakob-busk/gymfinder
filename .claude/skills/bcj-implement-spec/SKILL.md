---
name: bcj-implement-spec
description: "Implement a piece of work based on a spec and its set of issues."
disable-model-invocation: true
---

You have been provided a parent spec. This spec should have issues associated with it, describing how to implement the spec.

The goal is a PR which implements the entire spec on a single branch.

The issues are not a list of steps. They are a task graph with blocking relationships between them. This means there is always a frontier of issues which are ready to be grabbed.

Communication to and from subagents should be sparse. Communicate primarily through context pointers: to the spec, issues, research notes, and previous commits. Don't duplicate information already available via pointers.

Implementer subagents should be run in the background where possible for maximum concurrency.

## Steps

Read the spec and issues. Read enough to understand the task graph.

**(optional) Use an exploration subagent to conduct any exploration required by the issues - relevant codebase files or external documentation. Ensure the exploration subagent can save files - it should save its markdown notes in a directory outside the repo, accessible by all future subagents. This lets implementer subagents focus on implementation rather than exploration.**

Draft a PR for the current task branch. Its title ends with `(#<parent#>)`, the parent spec issue.

Use implementer subagents to implement each ticket. Each implementer subagent should work in its own worktree, on its own branch.
Implementer subagents should read `CODING_STANDARDS.md`

Once an implementer subagent is working on an issue, mark the issue with the agent-wip label in Github

Once an implementer subagent completes, merge its work to the PR branch with a merger subagent.

If this changes the frontier of available issues, kick off more implementer subagents to work on the new issues. This allows for maximum concurrency.

Once an issue is implemented it should be marked as completed on Github, and the agent-wip label should be removed. If an implementer subagent can't finish an issue, leave it open, swap `agent-wip` for `needs-human`, and carry on with the rest of the frontier.

Once all issues are complete, run `/code-review` on the PR branch against `main`.
Fix all hard violations and spec gaps raised by the code review in a single implementer subagent.

Make a report as a comment on the finished PR with the other review findings, that wasn't fixed.

Make another report as a comment on the finished PR of the overall implementation. Is there anything the human should know about the implementations? Any complications?

Mark the PR as ready for review.

Mark the original parent spec with the needs-qa label and remove `spec` — or `needs-human` instead of `needs-qa` if any sub-issue was handed over.

Clean up all implementer subagent worktrees.

If an exploration subagent was used, clean up the markdown notes it made outside the repo.
