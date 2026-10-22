---
name: bcj-to-spec
description: Turn the current conversation into a spec and publish it as the parent spec issue on the project issue tracker — no interview, just synthesis of what you've already discussed.
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a **spec**, then publishes it as the **parent spec issue** for the task. Do NOT interview the user — just synthesize what you already know.

**Read `docs/workflow/issue-tracker.md` first** — it is the issue tracker and triage label vocabulary for this repo (which tracker, which repo, which CLI, which labels). Do **not** run `/setup-matt-pocock-skills`.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the spec using the template below.

4. **Publish it as the parent spec issue.** This is the umbrella issue for the whole task; `/bcj-to-issues` will hang the implementation tasks off it as sub-issues.

- **Title** = the task name.
- **Body** = the spec.
- **Assignee** = the driver (the person running this task). Default to the current user (`gh api user --jq .login`) unless told otherwise.
- **Triage label** = `spec` — the parent carries this while its sub-issues are still being built. Never `needs-qa`: `/bcj-implement-spec` swaps it to `needs-qa` itself, once every sub-issue has closed (or to `needs-human` if one was handed over). Do **NOT** apply `ready-for-agent` to the parent — the umbrella issue must stay OUT of the pool of implementable tasks. Only the sub-issue tasks produced by `/bcj-to-issues` carry `ready-for-agent` and get implemented.
- **Slug must match the task branch — and MUST be recorded in the body.** By now the operator has already started the task on a `<type>/<slug>` branch/worktree, where `<type>` is `feat`, `fix`, `chore` or `docs` (chosen by `/bcj-new-task`), so the parent's identity must line up with that branch. Read the current branch (`git rev-parse --abbrev-ref HEAD`); if it is `<type>/<slug>` with one of those four types, **always write that exact branch string, prefix included, into the parent spec body** (see the `## Branch` section in the template). Do **not** invent a new slug, and do not change the type.

  This is a load-bearing rail, not a nicety: `/bcj-qa-task` and `/bcj-finish-task` resolve a worktree back to its parent spec issue by **searching issues for the `<type>/<slug>` string in the body**. Titling the parent so it merely *slugifies* to `<slug>` is NOT sufficient — the literal string must be in the body or that lookup finds nothing. Keep GitHub the single source of truth; no separate mapping file.

  If the current branch is not a `feat/*`, `fix/*`, `chore/*` or `docs/*` branch, warn the operator (they likely skipped `/bcj-new-task`) before publishing.

Report the parent spec issue number back to the user — `/bcj-to-issues` needs it to attach the sub-issues.

<spec-template>

## Branch

`<type>/<slug>` (e.g. `fix/husstand`) — the exact branch this task lives on. Required, verbatim: `/bcj-qa-task` and
`/bcj-finish-task` find this parent spec issue by searching for this string.

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
